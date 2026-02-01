import pg from 'pg';
import { sendMentionNotification, sendTaskAssignmentEmail, sendRevisionRequestEmail } from './send-email';
import { compose, withCORS, withAuth, withRateLimit, type AuthResult, type NetlifyEvent } from './_shared/middleware';
import { getCorsHeaders } from './_shared/cors';
import { RATE_LIMITS } from './_shared/rateLimit';
import { SCHEMAS } from './_shared/schemas';
import { validateRequest } from './_shared/validation';

const { Client } = pg;

const getDbClient = () => {
  const DATABASE_URL = process.env.DATABASE_URL;
  if (!DATABASE_URL) {
    throw new Error('DATABASE_URL not configured');
  }

  return new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
};

// Validate task status transitions
const isValidUUID = (id: string): boolean => {
  const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return regex.test(id);
};

const isValidTransition = (oldStatus: string, newStatus: string): boolean => {
  const validTransitions: Record<string, string[]> = {
    'pending': ['in_progress', 'completed'],
    'in_progress': ['awaiting_approval', 'completed', 'pending'],
    'awaiting_approval': ['completed', 'revision_requested', 'in_progress'],
    'revision_requested': ['in_progress'],
    'completed': [] // Terminal state
  };
  return validTransitions[oldStatus]?.includes(newStatus) ?? false;
};

// Map database row to Task object
function mapTaskFromDB(row: any): any {
  return {
    id: row.id,
    projectId: row.project_id,
    title: row.title,
    description: row.description,
    status: row.stage, // Map stage to status for frontend
    visibleToClient: row.is_client_visible,
    assignedTo: row.assigned_to,
    deadline: row.due_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdBy: row.created_by,
  };
}

// Convert comment from DB to frontend format
const mapCommentFromDB = (dbComment: any) => {
  return {
    id: dbComment.id,
    userId: dbComment.user_id,
    userName: dbComment.user_name,
    content: dbComment.content,
    createdAt: dbComment.created_at
  };
};

export const handler = compose(
  withCORS(['GET', 'POST', 'PATCH', 'DELETE']),
  withAuth(),
  withRateLimit(RATE_LIMITS.api, 'tasks')
)(async (event: NetlifyEvent, auth?: AuthResult) => {
  const origin = event.headers.origin || event.headers.Origin;
  const headers = getCorsHeaders(origin);

  const client = getDbClient();

  try {
    await client.connect();

    // ========================================================================
    // GET - Fetch tasks
    // ========================================================================
    if (event.httpMethod === 'GET') {
      const pathParts = event.path.split('/');
      const lastPart = pathParts[pathParts.length - 1];

      // GET /tasks/{taskId} - Fetch single task with comments
      if (lastPart !== 'tasks' && !event.queryStringParameters?.projectId) {
        const taskId = lastPart;

        const taskResult = await client.query(
          `SELECT * FROM tasks WHERE id = $1`,
          [taskId]
        );

        if (taskResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        const task = mapTaskFromDB(taskResult.rows[0]);

        // Check if client is trying to access an internal-only task
        // Return 404 (not 403) to prevent enumeration attacks
        const authenticatedRole = auth?.user?.role;
        const clientRoles = ['client', 'client_primary', 'client_team'];
        if (authenticatedRole && clientRoles.includes(authenticatedRole) && !task.visibleToClient) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        // Fetch comments for this task
        const commentsResult = await client.query(
          `SELECT * FROM task_comments WHERE task_id = $1 ORDER BY created_at ASC`,
          [taskId]
        );

        task.comments = commentsResult.rows.map(mapCommentFromDB);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(task),
        };
      }

      // GET /tasks?projectId={id}&includeComments=true - Fetch all tasks for project
      const { projectId, includeComments } = event.queryStringParameters || {};

      if (!projectId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'projectId parameter is required' }),
        };
      }

      // Validate projectId is a valid UUID
      if (!isValidUUID(projectId)) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid projectId format: Must be a UUID' }),
        };
      }

      // Fetch all tasks for a project
      const tasksResult = await client.query(
        `SELECT * FROM tasks WHERE project_id = $1 ORDER BY created_at DESC`,
        [projectId]
      );

      let tasks = tasksResult.rows.map(mapTaskFromDB);

      // Filter out internal-only tasks for clients
      const authenticatedRole = auth?.user?.role;
      const clientRoles = ['client', 'client_primary', 'client_team'];
      if (authenticatedRole && clientRoles.includes(authenticatedRole)) {
        tasks = tasks.filter(task => task.visibleToClient);
      }

      // Include comments if requested
      if (includeComments === 'true' && tasks.length > 0) {
        const taskIds = tasks.map(t => t.id);
        const commentsResult = await client.query(
          `SELECT * FROM task_comments
           WHERE task_id = ANY($1)
           ORDER BY created_at ASC`,
          [taskIds]
        );

        const commentsByTaskId: Record<string, any[]> = {};
        commentsResult.rows.forEach(comment => {
          if (!commentsByTaskId[comment.task_id]) {
            commentsByTaskId[comment.task_id] = [];
          }
          commentsByTaskId[comment.task_id].push(mapCommentFromDB(comment));
        });

        tasks = tasks.map(task => ({
          ...task,
          comments: commentsByTaskId[task.id] || []
        }));
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(tasks),
      };
    }

    // ========================================================================
    // POST - Create new task or add comment
    // ========================================================================
    if (event.httpMethod === 'POST') {
      const pathParts = event.path.split('/');

      // POST /tasks/{taskId}/comments - Add comment to task
      if (pathParts.includes('comments')) {
        const taskId = pathParts[pathParts.length - 2];
        const commentData = JSON.parse(event.body || '{}');

        if (!commentData.user_id || !commentData.user_name || !commentData.content) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'user_id, user_name, and content are required' }),
          };
        }

        const result = await client.query(
          `INSERT INTO task_comments (task_id, user_id, user_name, content)
           VALUES ($1, $2, $3, $4)
           RETURNING *`,
          [taskId, commentData.user_id, commentData.user_name, commentData.content]
        );


        const newComment = mapCommentFromDB(result.rows[0]);

        // --------------------------------------------------------------------
        // Handle @mentions and send notifications
        // --------------------------------------------------------------------
        try {
          const content = commentData.content;
          // Regex to match @mentions - captures @followed by one or more word characters or spaces
          const MENTION_REGEX = /@([A-Za-z][A-Za-z\s]*?)(?=\s@|\s|,|\.|\!|\?|$)/g;
          const matches = [...content.matchAll(MENTION_REGEX)];
          const mentionedNames = matches.map(m => m[1].trim());

          if (mentionedNames.length > 0) {
            // Fetch users matching these names
            // Note: This is a simple case-insensitive name match. 
            // In a production app, we should use IDs in the mention format (e.g. @[Name](userId))
            const usersResult = await client.query(
              `SELECT id, email, name FROM users WHERE LOWER(name) = ANY($1)`,
              [mentionedNames.map((n: string) => n.toLowerCase())]
            );

            // Fetch task details for the email
            const taskDetailsResult = await client.query(
              `SELECT title FROM tasks WHERE id = $1`,
              [taskId]
            );
            const taskTitle = taskDetailsResult.rows[0]?.title || 'Task';
            const taskUrl = `${process.env.URL || 'http://localhost:5173'}/project/${taskId}`; // Simplified URL

            // Send emails if user has mentions enabled
            await Promise.all(usersResult.rows.map(async (user: any) => {
              // Don't notify the person who wrote the comment
              if (user.id === commentData.user_id) return;

              // Check user preferences
              const prefResult = await client.query(
                `SELECT email_mention FROM user_preferences WHERE user_id = $1`,
                [user.id]
              );
              // Default to true if no preference record found
              const emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_mention;

              if (emailEnabled) {
                await sendMentionNotification({
                  to: user.email,
                  mentionedByName: commentData.user_name,
                  taskTitle: taskTitle,
                  commentContent: content,
                  taskUrl: taskUrl
                });
                console.log(`Sent mention notification to ${user.email}`);
              } else {
                console.log(`Skipped mention notification for ${user.email} (disabled in preferences)`);
              }
            }));
          }
        } catch (error) {
          console.error('Failed to process mentions:', error);
          // Continue execution - don't fail the request just because notification failed
        }

        return {
          statusCode: 201,
          headers,
          body: JSON.stringify(newComment),
        };
      }

      // POST /tasks/{taskId}/follow - Follow a task
      if (pathParts.includes('follow')) {
        const taskId = pathParts[pathParts.length - 2];
        const followData = JSON.parse(event.body || '{}');

        if (!followData.userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId is required' }),
          };
        }

        // Validate taskId is a valid UUID
        if (!isValidUUID(taskId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid taskId format: Must be a UUID' }),
          };
        }

        // Validate userId is a valid UUID
        if (!isValidUUID(followData.userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid userId format: Must be a UUID' }),
          };
        }

        // Check if task exists
        const taskCheck = await client.query(
          `SELECT id FROM tasks WHERE id = $1`,
          [taskId]
        );

        if (taskCheck.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        // Insert follow (or ignore if already following)
        await client.query(
          `INSERT INTO task_followers (task_id, user_id)
           VALUES ($1, $2)
           ON CONFLICT (task_id, user_id) DO NOTHING`,
          [taskId, followData.userId]
        );

        // Return the task with updated followers list
        const taskResult = await client.query(
          `SELECT * FROM tasks WHERE id = $1`,
          [taskId]
        );

        const followersResult = await client.query(
          `SELECT user_id FROM task_followers WHERE task_id = $1`,
          [taskId]
        );

        const task = mapTaskFromDB(taskResult.rows[0]);
        task.followers = followersResult.rows.map(r => r.user_id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(task),
        };
      }

      // POST /tasks/{taskId}/unfollow - Unfollow a task
      if (pathParts.includes('unfollow')) {
        const taskId = pathParts[pathParts.length - 2];
        const unfollowData = JSON.parse(event.body || '{}');

        if (!unfollowData.userId) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'userId is required' }),
          };
        }

        // Validate taskId is a valid UUID
        if (!isValidUUID(taskId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid taskId format: Must be a UUID' }),
          };
        }

        // Validate userId is a valid UUID
        if (!isValidUUID(unfollowData.userId)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'Invalid userId format: Must be a UUID' }),
          };
        }

        // Check if task exists
        const taskCheck = await client.query(
          `SELECT id FROM tasks WHERE id = $1`,
          [taskId]
        );

        if (taskCheck.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        // Remove follow
        await client.query(
          `DELETE FROM task_followers WHERE task_id = $1 AND user_id = $2`,
          [taskId, unfollowData.userId]
        );

        // Return the task with updated followers list
        const taskResult = await client.query(
          `SELECT * FROM tasks WHERE id = $1`,
          [taskId]
        );

        const followersResult = await client.query(
          `SELECT user_id FROM task_followers WHERE task_id = $1`,
          [taskId]
        );

        const task = mapTaskFromDB(taskResult.rows[0]);
        task.followers = followersResult.rows.map(r => r.user_id);

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(task),
        };
      }

      // POST /tasks - Create new task
      const validation = validateRequest(event.body, SCHEMAS.task.create, origin);
      if (!validation.success) return validation.response;
      const taskData = validation.data;

      // Permission check: Clients can create tasks but with restricted fields
      const userRole = auth?.user?.role;
      const clientRoles = ['client', 'client_primary', 'client_team'];
      const isClientUser = userRole && clientRoles.includes(userRole);

      // For client users: strip restricted fields and force visible_to_client = true
      // Clients can only assign tasks to themselves (self-assignment)
      if (isClientUser) {
        if (taskData.assignedTo && taskData.assignedTo !== auth?.user?.id) {
          taskData.assignedTo = undefined;
        }
        taskData.priority = undefined;
      }

      const rawBody = JSON.parse(event.body || '{}');

      // Use the authenticated user as the task creator, fall back to request body or first DB user
      let createdBy = auth?.user?.userId || rawBody.created_by;
      if (createdBy && !isValidUUID(createdBy)) {
        createdBy = null;
      }
      if (!createdBy) {
        const userResult = await client.query('SELECT id FROM users LIMIT 1');
        createdBy = userResult.rows[0]?.id;
      }

      // Clients: force visible_to_client = true; others: use provided value or default false
      const visibleToClient = isClientUser
        ? true
        : (rawBody.visible_to_client !== undefined ? rawBody.visible_to_client : false);

      const result = await client.query(
        `INSERT INTO tasks (
          project_id, title, description, stage,
          is_client_visible, assigned_to, due_date, position, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
          taskData.projectId,
          taskData.title,
          taskData.description,
          taskData.status || 'pending',
          visibleToClient,
          isClientUser ? null : (taskData.assignedTo || null),
          taskData.dueDate || null,
          0, // position - default to 0
          createdBy
        ]
      );

      const newTask = mapTaskFromDB(result.rows[0]);
      newTask.comments = [];

      // Send email notification if assigned
      if (taskData.assignedTo) {
        try {
          const projectResult = await client.query('SELECT project_number FROM projects WHERE id = $1', [taskData.projectId]);
          const assigneeResult = await client.query('SELECT email, full_name FROM users WHERE id = $1', [taskData.assignedTo]);

          if (projectResult.rows.length > 0 && assigneeResult.rows.length > 0) {
            const projectNumber = projectResult.rows[0].project_number;
            const assignee = assigneeResult.rows[0];
            const taskUrl = `${process.env.URL || 'http://localhost:5173'}/project/${taskData.project_id}?task=${newTask.id}`;

            // Check user preferences
            const prefResult = await client.query(
              `SELECT email_task_assignment FROM user_preferences WHERE user_id = $1`,
              [taskData.assignedTo]
            );
            const emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_task_assignment;

            if (emailEnabled) {
              await sendTaskAssignmentEmail({
                to: assignee.email,
                assigneeName: assignee.full_name,
                taskTitle: newTask.title,
                projectNumber: projectNumber,
                dueDate: newTask.deadline,
                taskUrl: taskUrl
              });
              console.log(`Sent assignment email to ${assignee.email}`);
            } else {
              console.log(`Skipped assignment email to ${assignee.email} (disabled in preferences)`);
            }
          }
        } catch (error) {
          console.error('Failed to send assignment email:', error);
          // Don't fail the request
        }
      }

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(newTask),
      };
    }

    // ========================================================================
    // PATCH - Update task
    // ========================================================================
    if (event.httpMethod === 'PATCH') {
      const pathParts = event.path.split('/');
      const taskId = pathParts[pathParts.length - 1];

      if (!taskId || taskId === 'tasks') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Task ID is required' }),
        };
      }

      // Permission check: Clients can only edit tasks they created
      const userRole = auth?.user?.role;
      const clientRoles = ['client', 'client_primary', 'client_team'];
      const isClientRole = userRole && clientRoles.includes(userRole);

      if (isClientRole) {
        const taskCreatorCheck = await client.query(
          'SELECT created_by FROM tasks WHERE id = $1',
          [taskId]
        );
        if (!taskCreatorCheck.rows.length || taskCreatorCheck.rows[0].created_by !== auth?.user?.userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'You can only edit tasks you created',
              code: 'PERMISSION_DENIED'
            }),
          };
        }
      }

      const validation = validateRequest(event.body, SCHEMAS.task.update, origin);
      if (!validation.success) return validation.response;
      const updates = validation.data;

      // Clients can only update a subset of fields on their own tasks
      const clientAllowedFields = ['title', 'description', 'status', 'dueDate'];
      const allowedFields = isClientRole
        ? clientAllowedFields
        : [
            'title',
            'description',
            'status', // maps to 'stage' in DB
            'visibleToClient', // maps to 'is_client_visible' in DB
            'assignedTo', // maps to 'assigned_to' in DB
            'dueDate', // maps to 'due_date' in DB
          ];

      // Validate status transition if status is being updated
      if (updates.status) {
        const currentTaskResult = await client.query(
          `SELECT stage, project_id, title FROM tasks WHERE id = $1`,
          [taskId]
        );

        if (currentTaskResult.rows.length === 0) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }

        const oldStatus = currentTaskResult.rows[0].stage;

        // Skip validation if status isn't actually changing
        if (oldStatus !== updates.status && !isValidTransition(oldStatus, updates.status)) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              error: `Invalid status transition from ${oldStatus} to ${updates.status}`
            }),
          };
        }

        // Handle Revision Request Logic
        if (updates.status === 'revision_requested' && oldStatus !== 'revision_requested') {
          const projectId = currentTaskResult.rows[0].project_id;
          const taskTitle = currentTaskResult.rows[0].title;

          // 1. Get Project Details & Check Quota
          const projectRes = await client.query(
            `SELECT id, total_revisions_allowed, revisions_used, project_number, client_user_id, name FROM projects WHERE id = $1`,
            [projectId]
          );

          if (projectRes.rows.length === 0) {
            return { statusCode: 404, headers, body: JSON.stringify({ error: 'Project not found' }) };
          }

          const project = projectRes.rows[0];

          if (project.revisions_used >= project.total_revisions_allowed) {
            return {
              statusCode: 400,
              headers,
              body: JSON.stringify({ error: 'Revision quota exceeded' })
            };
          }

          // 2. Increment Revision Count
          await client.query(
            `UPDATE projects SET revisions_used = revisions_used + 1 WHERE id = $1`,
            [projectId]
          );

          // 3. Send Email Notification
          try {
            // Get the client's name for "Requested By"
            const clientUserRes = await client.query(`SELECT full_name FROM users WHERE id = $1`, [project.client_user_id]);
            const requestedBy = clientUserRes.rows[0]?.full_name || 'Client';

            // Limit emails to admins/PMs
            const teamRes = await client.query(`SELECT email FROM users WHERE role IN ('admin', 'project_manager')`);

            const taskUrl = `${process.env.URL || 'http://localhost:5173'}/project/${projectId}?task=${taskId}`;
            const revisionStatus = `${project.revisions_used + 1} of ${project.total_revisions_allowed} used`;

            const emailPromises = teamRes.rows.map(async (admin) => {
              // Check preferences for each admin
              // Using email_project_update for revision requests
              const prefResult = await client.query(
                `SELECT email_project_update FROM user_preferences WHERE user_id = (SELECT id FROM users WHERE email = $1)`,
                [admin.email]
              );
              const emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_project_update;

              if (emailEnabled) {
                return sendRevisionRequestEmail({
                  to: admin.email,
                  projectName: project.name || project.project_number,
                  taskTitle: taskTitle,
                  taskUrl: taskUrl,
                  revisionCount: revisionStatus,
                  requestedBy: requestedBy
                });
              }
            });

            await Promise.all(emailPromises);
            console.log(`Sent revision request emails to ${teamRes.rows.length} team members`);

          } catch (emailError) {
            console.error('Failed to send revision request email:', emailError);
            // Don't block the status update
          }
        }
      }

      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      Object.keys(updates).forEach((key) => {
        if (allowedFields.includes(key)) {
          // Convert camelCase to snake_case for DB
          const dbKey = key === 'visibleToClient' ? 'is_client_visible' :
            key === 'assignedTo' ? 'assigned_to' :
              key === 'dueDate' ? 'due_date' :
                key === 'status' ? 'stage' :
                  key;

          updateFields.push(`${dbKey} = $${paramIndex}`);
          updateValues.push(updates[key]);
          paramIndex++;
        }
      });

      if (updateFields.length === 0) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'No valid fields to update' }),
        };
      }

      updateFields.push(`updated_at = NOW()`);

      const query = `
        UPDATE tasks
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING *
      `;

      updateValues.push(taskId);

      const result = await client.query(query, updateValues);

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        };
      }

      const updatedTask = mapTaskFromDB(result.rows[0]);

      // Check for assignment change and send email
      if (updates.assignedTo) {
        try {
          // Get current user ID from checking the assignedTo update vs old one?
          // Actually, we just check if it's set.
          // Note: Ideally we should check if it CHANGED, but standard update logic usually implies intention.
          // Plus we already did the update.

          const assignedTo = updates.assignedTo;
          const projectId = updatedTask.projectId;

          const projectResult = await client.query('SELECT project_number FROM projects WHERE id = $1', [projectId]);
          const assigneeResult = await client.query('SELECT email, full_name FROM users WHERE id = $1', [assignedTo]);

          if (projectResult.rows.length > 0 && assigneeResult.rows.length > 0) {
            const projectNumber = projectResult.rows[0].project_number;
            const assignee = assigneeResult.rows[0];
            const taskUrl = `${process.env.URL || 'http://localhost:5173'}/project/${projectId}?task=${taskId}`;

            // Check user preferences
            const prefResult = await client.query(
              `SELECT email_task_assignment FROM user_preferences WHERE user_id = $1`,
              [assignedTo]
            );
            const emailEnabled = prefResult.rows.length === 0 || prefResult.rows[0].email_task_assignment;

            if (emailEnabled) {
              await sendTaskAssignmentEmail({
                to: assignee.email,
                assigneeName: assignee.full_name,
                taskTitle: updatedTask.title,
                projectNumber: projectNumber,
                dueDate: updatedTask.deadline,
                taskUrl: taskUrl
              });
              console.log(`Sent assignment email to ${assignee.email}`);
            } else {
              console.log(`Skipped assignment email to ${assignee.email} (disabled in preferences)`);
            }
          }
        } catch (error) {
          console.error('Failed to send assignment update email:', error);
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(updatedTask),
      };
    }

    // ========================================================================
    // DELETE - Delete task
    // ========================================================================
    if (event.httpMethod === 'DELETE') {
      const pathParts = event.path.split('/');
      const taskId = pathParts[pathParts.length - 1];

      if (!taskId || taskId === 'tasks') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Task ID is required' }),
        };
      }

      // Permission check: Admin/PM can delete any task; creators can delete their own
      const deleteUserRole = auth?.user?.role;
      const deleteAllowedRoles = ['super_admin', 'project_manager'];

      if (!deleteUserRole || !deleteAllowedRoles.includes(deleteUserRole)) {
        const taskOwnerCheck = await client.query(
          'SELECT created_by FROM tasks WHERE id = $1',
          [taskId]
        );
        if (!taskOwnerCheck.rows.length) {
          return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Task not found' }),
          };
        }
        if (taskOwnerCheck.rows[0].created_by !== auth?.user?.userId) {
          return {
            statusCode: 403,
            headers,
            body: JSON.stringify({
              error: 'You can only delete tasks you created',
              code: 'PERMISSION_DENIED'
            }),
          };
        }
      }

      const result = await client.query(
        `DELETE FROM tasks WHERE id = $1 RETURNING id`,
        [taskId]
      );

      if (result.rows.length === 0) {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Task not found' }),
        };
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Tasks API error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  } finally {
    await client.end();
  }
});
