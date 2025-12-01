# Gemini CLI Custom Slash Commands

This directory contains custom slash commands for the Gemini CLI / Antigravity AI interface.

## 📂 Directory Structure

```
.gemini/commands/
└── workflows/
    ├── create-task.toml      # Generate task breakdowns
    ├── analyze-project.toml  # Analyze project health
    ├── review-code.toml      # Code review assistant
    ├── generate-tests.toml   # Test case generator
    ├── create-prompt.toml    # Prompt optimizer
    ├── debug.toml            # Debugging helper
    ├── document.toml         # Documentation writer
    └── refactor.toml         # Code refactoring
```

## 🎯 Available Commands

### Project Management
- `/workflows:create-task` - Generate detailed task breakdowns for deliverables
- `/workflows:analyze-project` - Analyze project health, risks, and get recommendations

### Development
- `/workflows:review-code` - Get comprehensive code reviews
- `/workflows:debug` - Debug and troubleshoot issues systematically
- `/workflows:refactor` - Improve code quality while maintaining functionality

### Testing & Quality
- `/workflows:generate-tests` - Create comprehensive test cases

### AI & Documentation
- `/workflows:create-prompt` - Generate optimized AI prompts
- `/workflows:document` - Create clear technical documentation

## 💡 How to Use

1. Open the Antigravity AI chat interface
2. Type `/workflows:` to see all available workflow commands
3. Select a command or type it fully (e.g., `/workflows:create-task`)
4. Provide your input after the command
5. Get structured, expert responses

### Example Usage

```
/workflows:create-task Build a user authentication system with email and social login

/workflows:review-code [paste your code here]

/workflows:debug Getting "Cannot read property 'id' of undefined" in React component
```

## 🛠 Command Format

Commands follow the Gemini CLI TOML format:

```toml
# Command description
prompt = """
Your prompt template here
Use {{args}} to reference user input
"""
```

### Namespacing

Since these files are in `commands/workflows/`, they become namespaced as `/workflows:command-name`:
- `workflows/create-task.toml` → `/workflows:create-task`
- `workflows/debug.toml` → `/workflows:debug`

## 📝 Creating New Commands

1. Create a new `.toml` file in the appropriate directory
2. Use this template:

```toml
# Brief description of what this command does

prompt = """
Your prompt template here.
Use {{args}} to reference user input.
Structure your prompt for clear, actionable responses.
"""
```

3. Reload the Antigravity interface to see your new command

## 🔍 Tips

- **Be specific** - Provide context and details in your input
- **Use examples** - Show the AI what you're working with
- **Iterate** - Refine your prompts based on responses
- **Chain commands** - Use one command's output as input for another

## 📚 Resources

- [Gemini CLI Custom Slash Commands Blog](https://cloud.google.com/blog/topics/developers-practitioners/gemini-cli-custom-slash-commands)
- [Supercharge Your AI Workflow with Custom Slash Commands](https://medium.com/googledeveloperseurope/supercharge-your-ai-workflow-with-custom-slash-commands-gemini-cli-73dd379ce224)

## 🚀 Next Steps

Try out the workflows and customize them for your team's specific needs. Feel free to:
- Modify existing prompts
- Add new commands
- Create team-specific workflows
- Share useful commands with your team
