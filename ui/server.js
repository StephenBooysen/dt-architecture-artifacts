const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/styles', express.static('styles'));
app.use('/js', express.static('js'));

app.get('/', (req, res) => {
    const publicDir = path.join(__dirname, 'public');
    
    let folders = [];
    try {
        if (fs.existsSync(publicDir)) {
            folders = fs.readdirSync(publicDir)
                .filter(item => {
                    const itemPath = path.join(publicDir, item);
                    return fs.statSync(itemPath).isDirectory();
                })
                .map(folder => ({
                    name: folder,
                    displayName: folder.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                }));
        }
    } catch (error) {
        console.error('Error reading public directory:', error);
    }

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Knowledge Management System</title>
    <link rel="stylesheet" href="/styles/main.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="logo">
                <img src="/assets/stech-black.png" alt="STech Logo" class="logo-img">
                <h1>Knowledge Management System</h1>
            </div>
            <p class="subtitle">Business Solution Architecture Portal</p>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <section class="intro">
                <h2>Enterprise Business Solutions</h2>
                <p>Explore comprehensive views of our business solutions across multiple architectural perspectives.</p>
            </section>

            <div class="grid-container">
                ${folders.length > 0 ? folders.map(folder => `
                    <div class="solution-card">
                        <div class="card-header">
                            <h3>${folder.displayName}</h3>
                        </div>
                        <div class="card-body">
                            <p>Explore the architectural perspectives and capabilities of this business solution.</p>
                            <div class="viewpoints">
                                <span class="tag">Business</span>
                                <span class="tag">Capability</span>
                                <span class="tag">Data</span>
                                <span class="tag">Technology</span>
                            </div>
                        </div>
                        <div class="card-footer">
                            <a href="/${folder.name}" class="btn-primary">View Solution</a>
                        </div>
                    </div>
                `).join('') : `
                    <div class="no-solutions">
                        <h3>No Solutions Available</h3>
                        <p>Create folders in the public directory to display business solutions.</p>
                    </div>
                `}
            </div>
        </div>
    </main>

    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 STech Enterprise Architecture. All rights reserved.</p>
        </div>
    </footer>
</body>
</html>`;
    
    res.send(html);
});

app.get('/:solution', (req, res) => {
    const solution = req.params.solution;
    const solutionPath = path.join(__dirname, 'public', solution);
    
    if (!fs.existsSync(solutionPath) || !fs.statSync(solutionPath).isDirectory()) {
        return res.status(404).send('Solution not found');
    }
    
    const displayName = solution.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayName} - Knowledge Management System</title>
    <link rel="stylesheet" href="/styles/main.css">
    <link rel="stylesheet" href="/styles/solution.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="logo">
                <img src="/assets/stech-black.png" alt="STech Logo" class="logo-img">
                <h1>Knowledge Management System</h1>
            </div>
            <nav class="breadcrumb">
                <a href="/">Home</a> > <span>${displayName}</span>
            </nav>
        </div>
    </header>

    <main class="main">
        <div class="container">
            <div class="solution-header">
                <h1>${displayName}</h1>
                <div class="status-badges">
                    <span class="badge status-live">Live</span>
                    <span class="badge ownership-business">Business Owned</span>
                </div>
            </div>

            <div class="tabs">
                <button class="tab-button active" data-tab="business">Business View</button>
                <button class="tab-button" data-tab="capability">Capability View</button>
                <button class="tab-button" data-tab="data">Data View</button>
                <button class="tab-button" data-tab="principles">Principles View</button>
                <button class="tab-button" data-tab="context">Context View</button>
                <button class="tab-button" data-tab="technology">Technology View</button>
            </div>

            <div class="tab-content">
                <div id="business" class="tab-pane active">
                    <iframe src="/${solution}/business.html" frameborder="0"></iframe>
                </div>
                <div id="capability" class="tab-pane">
                    <iframe src="/${solution}/capability.html" frameborder="0"></iframe>
                </div>
                <div id="data" class="tab-pane">
                    <iframe src="/${solution}/data.html" frameborder="0"></iframe>
                </div>
                <div id="principles" class="tab-pane">
                    <iframe src="/${solution}/principles.html" frameborder="0"></iframe>
                </div>
                <div id="context" class="tab-pane">
                    <iframe src="/${solution}/context.html" frameborder="0"></iframe>
                </div>
                <div id="technology" class="tab-pane">
                    <iframe src="/${solution}/technology.html" frameborder="0"></iframe>
                </div>
            </div>
        </div>
    </main>

    <script src="/js/solution.js"></script>
</body>
</html>`;
    
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Knowledge Management System running on http://localhost:${PORT}`);
});