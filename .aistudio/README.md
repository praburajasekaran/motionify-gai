# AI Studio Workflows

This directory contains custom workflows (slash commands) for the Antigravity AI chat interface.

## Available Workflows

### Project Management
- `/create-task` - Generate task breakdowns for project deliverables
- `/analyze-project` - Analyze project health, risks, and get recommendations

### Development
- `/review-code` - Get code reviews with best practices and suggestions
- `/debug-issue` - Debug and troubleshoot technical issues
- `/refactor-code` - Improve code quality while maintaining functionality

### Testing
- `/generate-test-cases` - Create comprehensive test cases for features

### AI & Prompts
- `/create-prompt` - Generate optimized prompts for AI tasks

### Documentation
- `/write-documentation` - Create clear, comprehensive documentation

## How to Use

1. Open the Antigravity AI chat interface in your project
2. Type `/` in the chat input to see available workflows
3. Select a workflow from the menu
4. Provide the required input
5. The AI will execute the workflow and provide structured results

## Creating New Workflows

To add a new workflow:

1. Create a JSON file in `.aistudio/workflows/` with this structure:

```json
{
  "name": "workflow-name",
  "displayName": "Workflow Display Name",
  "description": "Brief description of what this workflow does",
  "prompt": "The prompt template with {{input}} placeholders",
  "parameters": {
    "input": {
      "type": "string",
      "description": "What the user should provide"
    }
  }
}
```

2. Register it in `.aistudio/workflows.json`:

```json
{
  "id": "workflow-name",
  "file": "workflows/workflow-name.json",
  "enabled": true,
  "category": "Category Name"
}
```

3. Reload the Antigravity interface to see your new workflow

## Tips

- Keep prompts focused and specific
- Use clear variable names in `{{placeholders}}`
- Provide good descriptions to help users understand what input is needed
- Test your workflows before deploying to production
- Use categories to organize related workflows

## Troubleshooting

**Workflows not appearing?**
- Ensure JSON files are valid (no syntax errors)
- Check that workflows are registered in `workflows.json`
- Try refreshing the Antigravity interface
- Verify file permissions

**Workflow not working as expected?**
- Review the prompt template
- Test with simple inputs first
- Check parameter types match what you're providing
- Review AI Studio logs for errors
