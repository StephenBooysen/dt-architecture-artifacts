## This file attempts to manage a todo list in this project

### Phases
- Phase 1: Fully functioning wiki for only me (1 user)
- Phase 2: Fully functioning wiki for more than me (multiple users)
- Phase 3: Shoprite enterprise integration
- Phase 4: AI with ollama

### Phase 1: Fully functioning wiki for only me (1 user)
#### Client
- Templates: Add templates list view and remove from left nav - done
- Templates: replace fields like {datetime}, {date}, {user}, {dayofweek}, {folder}, {filename} - done
- Markdown: Left nav to not refresh completely - done
- Security: Make login look like server login - done
- Markdowm: Left nav: Recent Files - done
- Markdowm: Left nav: (show as starred in search) - done
- Markdowm: Comments - done
- View: Search results screen - done
- View: Homepage - done
- Markdown - Preview first - done
    I would like to make a change based on me using the client for a bit. Currently the default view when clicking on a mardown file is edit mode. I would like to change this to become that when you click on a mardown file then the default view is to preview. And then you click on a button to edit, so then load the current mardown editor. Please thing about this and execute it for me.     
- BUG: Alternative files (PDF) viewer not working - done
- Navigation - add ... to end of folder and filenames not fold  - done
- Navigation - add upload button like folder and file - done
- Markdown - Shortcut keys :  Delete on tree, enter on mardown file creation - done
- Swagger - Service - done
- Swagger - Core API - done
 
#### Server
- Services: Screens should work - done
- Log out button should redirect to landing page - done
- Put log out in header - done

#### Plugins
- Ms word to markdown - done
- MS powerpoint to markdown - done

### Phase 1: Bugs




### Phase 2: Fully functioning wiki for more than me (multiple users)
#### Client
- Subscribe to changes and notify in notification popup
- Markdown - Tree drag files into folders
- Bug Files greater than 10mb failing
- File manager for folders 
- File manager for git
- Show who is looking at the page (socket.io)
- View: Have a knowledge view that has no editing

#### Server
- Security: Roles and permissions (read, write, backoffice) - done
- Settings: Git and files
- Infrastucture: Multi threaded

#### Plugins
- 

### Phase 3: Shoprite enterprise integration
#### Client
- Knowledge view
- Readonly pages

#### Server

- View: Knowledge View
- Platform: Client and server plugins
- Optomisations: Caching for markdown files for search and categories
- Optomisations: Searching for markdown files for search and categories
- Services: Workflow for Plugins

#### Plugins
- Import ARIS items
- Import Jira
- Import Code 

### Phase 4: AI with ollama
#### Client
- Auto complete markdown
- Ask questions about data

#### Server
- AI Settings

#### Plugins
- 
