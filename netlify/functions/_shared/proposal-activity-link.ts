interface DbClient {
  query(queryText: string, values?: any[]): Promise<{ rows: any[] }>;
}

export async function linkProposalActivitiesToProject(
  client: DbClient,
  params: { proposalId: string; projectId: string }
): Promise<void> {
  await client.query(
    `UPDATE activities
     SET project_id = $1
     WHERE proposal_id = $2
       AND project_id IS NULL`,
    [params.projectId, params.proposalId]
  );
}
