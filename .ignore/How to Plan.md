## Using Plan Mode:

### Activate Plan Mode:
Press Shift + Tab repeatedly until "Plan Mode" is displayed, or explicitly prompt Claude for a plan (e.g., "create a high-level plan").

### Define Requirements:
Clearly and concisely communicate your project requirements or the task you want Claude to plan.

### Claude's Planning:
In Plan Mode, Claude will utilize its read-only tools (e.g., Read, LS, Grep, WebSearch) to gather information and develop a comprehensive implementation plan.
Review and Approve:
Claude will present the generated plan to you. Review the plan carefully, provide feedback, and iterate with Claude if necessary to refine the strategy.

### Execute (Optional):
Once you are satisfied with the plan, you can exit Plan Mode (by pressing Shift + Tab again) and allow Claude to proceed with the actual implementation based on the approved plan.
Working with Plan Files (Optional, for more structured workflows):
For larger or more detailed projects, you can integrate Plan Mode with specific slash commands to manage and execute plans in a more structured way:

### Generate Plan File:
After brainstorming and refining the plan in Plan Mode, use a custom command like /create-plan-file to save the outline to a Markdown file (e.g., plan-v001.md).

### Generate Task File:
Convert the newest plan file into a task list using a command like /generate-task-file, which creates a file (e.g., tasks.md) with unchecked checkboxes for each task.

### Execute Tasks:
Use /run-next-task to have Claude implement the first unchecked task in tasks.md, marking it as complete upon successful execution. Repeat this command until all tasks are finished.

### Finalize Project:
Use a command like /finalise-project to add any remaining tasks, mark all boxes as checked, and commit the work with an itemized message detailing file changes.

### Benefits of using Plan Mode and Plan Files:
Safety:
Prevents unintended modifications during the research and planning phases.
Structured Planning:
Encourages thorough analysis and a well-defined approach for complex tasks.
User Control:
You retain control over when and how changes are made, approving each step of the plan.
Efficiency:
Can lead to more efficient use of tokens, especially with larger models, by ensuring a clear path before execution.