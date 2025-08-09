const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 4000;

app.use(express.static('public'));
app.use('/assets', express.static('assets'));
app.use('/styles', express.static('styles'));
app.use('/js', express.static('js'));

// Homepage with Knowledge View design
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
    <link rel="stylesheet" href="/styles/knowledge-view.css">
</head>
<body>
    <div class="app-container">
        <!-- Header -->
        <header class="app-header">
            <div class="app-title">
                <div class="app-icon">📊</div>
                <h1>Architecture Artifacts Editor</h1>
            </div>
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Search files and content...">
            </div>
            <div class="user-info">
                <span>Welcome, admin!</span>
                <span>Authenticated</span>
            </div>
        </header>

        <!-- Sidebar -->
        <aside class="app-sidebar">
            <div class="sidebar-section">
                <div class="sidebar-search">
                    <input type="text" placeholder="Knowledge Search">
                    <span class="search-icon">🔍</span>
                </div>
                <p style="color: var(--kv-text-light); font-size: 12px; text-align: center; margin: 8px 0;">
                    Please type a search term to find content
                </p>
                <p style="color: var(--kv-text-light); font-size: 11px; text-align: center; margin: 4px 0;">
                    Search through files and their content to discover knowledge
                </p>
            </div>

            <div class="sidebar-section">
                <h3>Spaces</h3>
                <ul class="sidebar-nav">
                    <li><a href="/"><span class="nav-icon">👤</span>Personal <small>(write)</small></a></li>
                    <li><a href="/"><span class="nav-icon">🌐</span>local-shared <small>(write)</small></a></li>
                    <li><a href="/"><span class="nav-icon">💎</span>Shared <small>(write)</small></a></li>
                    <li><a href="/" class="active"><span class="nav-icon">📖</span>Knowledge <small>(readonly)</small></a></li>
                </ul>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="app-main">
            <div class="content-container">
                <!-- Welcome Header -->
                <div class="solution-header">
                    <div class="solution-icon">📖</div>
                    <h1>Welcome to Knowledge View</h1>
                    <p>This is a read-only view of your content. Use the search functionality to discover and explore your knowledge base.</p>
                </div>

                <!-- Business Solutions Grid -->
                <div class="content-section">
                    <div class="section-header">
                        <div class="section-icon">🏢</div>
                        <h2>Enterprise Business Solutions</h2>
                    </div>
                    <div class="section-description">
                        Explore comprehensive views of our business solutions across multiple architectural perspectives.
                    </div>

                    <div class="cards-grid">
                        ${folders.length > 0 ? folders.map(folder => `
                            <div class="info-card">
                                <h3>
                                    <span style="margin-right: 8px;">🏗️</span>
                                    ${folder.displayName}
                                </h3>
                                <p>Explore the architectural perspectives and capabilities of this business solution including business, capability, data, principles, context, and technology views.</p>
                                <div style="margin: 12px 0;">
                                    <span class="status-badge status-live">Live</span>
                                    <span class="status-badge status-enhancing">Enhanced Views</span>
                                </div>
                                <a href="/${folder.name}" style="
                                    display: inline-block;
                                    background: var(--kv-primary);
                                    color: white;
                                    padding: 8px 16px;
                                    border-radius: 6px;
                                    text-decoration: none;
                                    font-size: 13px;
                                    font-weight: 500;
                                    margin-top: 8px;
                                ">View Solution →</a>
                            </div>
                        `).join('') : `
                            <div class="info-card">
                                <h3>
                                    <span style="margin-right: 8px;">💡</span>
                                    No Solutions Available
                                </h3>
                                <p>Create folders in the public directory to display business solutions.</p>
                            </div>
                        `}
                    </div>
                </div>

                <!-- Features Section -->
                <div class="content-section">
                    <div class="section-header">
                        <div class="section-icon">✨</div>
                        <h2>Knowledge Management Features</h2>
                    </div>
                    
                    <div class="cards-grid">
                        <div class="info-card">
                            <h3>
                                <span style="margin-right: 8px;">🔍</span>
                                Search through files and content
                            </h3>
                            <p>Comprehensive search capabilities across all architectural documentation and business solution content.</p>
                        </div>
                        
                        <div class="info-card">
                            <h3>
                                <span style="margin-right: 8px;">👁️</span>
                                View content in a clean, focused interface
                            </h3>
                            <p>Professional, distraction-free viewing experience optimized for architectural documentation.</p>
                        </div>
                        
                        <div class="info-card">
                            <h3>
                                <span style="margin-right: 8px;">🔒</span>
                                Read-only access ensures content integrity
                            </h3>
                            <p>Protected viewing environment maintains the integrity of your enterprise architecture documentation.</p>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>
</body>
</html>`;
    
    res.send(html);
});

// Capability detail pages
app.get('/:solution/capability-detail/:capabilityId', (req, res) => {
    const solution = req.params.solution;
    const capabilityId = req.params.capabilityId;
    
    // Map capability IDs to file names
    const capabilityFiles = {
        'order-management': 'order-management-detail.html'
    };
    
    const fileName = capabilityFiles[capabilityId];
    if (!fileName) {
        return res.status(404).send('Capability detail not found');
    }
    
    const filePath = path.join(__dirname, 'public', solution, fileName);
    if (!fs.existsSync(filePath)) {
        return res.status(404).send('Capability detail file not found');
    }
    
    res.sendFile(filePath);
});

// Individual solution pages with Knowledge View design
app.get('/:solution', (req, res) => {
    const solution = req.params.solution;
    const solutionPath = path.join(__dirname, 'public', solution);
    
    if (!fs.existsSync(solutionPath) || !fs.statSync(solutionPath).isDirectory()) {
        return res.status(404).send('Solution not found');
    }
    
    const displayName = solution.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    
    // Get solution description based on solution name
    const descriptions = {
        'digital-commerce-platform': 'Primary customer-facing e-commerce solution enabling online product browsing, purchasing, and order management across multiple channels.',
        'customer-loyalty-platform': 'Comprehensive loyalty program management system driving customer retention and engagement through personalized rewards and tier-based benefits.',
        'customer-data-platform': 'Unified customer data hub creating 360-degree customer views and enabling real-time personalization across all touchpoints.',
        'marketing-platform': 'Enterprise marketing automation and campaign management platform orchestrating omnichannel marketing campaigns.',
        'digital-advertising-platform': 'Advertising monetization platform managing banner advertisements, promoted products, and sponsored content across digital properties.',
        'erp-platform': 'Enterprise resource planning system managing core business processes including finance, procurement, HR, and supply chain operations.',
        'warehouse-platform': 'Warehouse management system controlling inventory, fulfillment operations, and warehouse automation across distribution centers.',
        'last-mile-delivery-platform': 'Delivery management system optimizing last-mile logistics and customer delivery experiences.',
        'data-analytics-platform': 'Enterprise data analytics and business intelligence platform providing insights and data-driven decision support.'
    };
    
    const solutionDescription = descriptions[solution] || 'Enterprise business solution with comprehensive architectural documentation.';
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${displayName} - Knowledge Management System</title>
    <link rel="stylesheet" href="/styles/knowledge-view.css">
</head>
<body>
    <div class="app-container">
        <!-- Header -->
        <header class="app-header">
            <div class="app-title">
                <div class="app-icon">📊</div>
                <h1>Architecture Artifacts Editor</h1>
            </div>
            <div class="search-container">
                <input type="text" class="search-input" placeholder="Search files and content...">
            </div>
            <div class="user-info">
                <span>Welcome, admin!</span>
                <span>Authenticated</span>
            </div>
        </header>

        <!-- Sidebar -->
        <aside class="app-sidebar">
            <div class="sidebar-section">
                <div class="sidebar-search">
                    <input type="text" placeholder="Knowledge Search">
                    <span class="search-icon">🔍</span>
                </div>
                <p style="color: var(--kv-text-light); font-size: 12px; text-align: center; margin: 8px 0;">
                    Please type a search term to find content
                </p>
            </div>

            <div class="sidebar-section">
                <h3>Spaces</h3>
                <ul class="sidebar-nav">
                    <li><a href="/"><span class="nav-icon">👤</span>Personal <small>(write)</small></a></li>
                    <li><a href="/"><span class="nav-icon">🌐</span>local-shared <small>(write)</small></a></li>
                    <li><a href="/"><span class="nav-icon">💎</span>Shared <small>(write)</small></a></li>
                    <li><a href="/" class="active"><span class="nav-icon">📖</span>Knowledge <small>(readonly)</small></a></li>
                </ul>
            </div>
        </aside>

        <!-- Main Content -->
        <main class="app-main">
            <div class="content-container">
                <!-- Solution Header -->
                <div class="solution-header">
                    <div class="solution-icon">🏗️</div>
                    <h1>${displayName}</h1>
                    <p>${solutionDescription}</p>
                </div>

                <!-- Navigation Tabs -->
                <nav class="content-tabs">
                    <button class="tab-button active" data-tab="business">Business View</button>
                    <button class="tab-button" data-tab="product-management">Product Management</button>
                    <button class="tab-button" data-tab="capability">Capabilities</button>
                    <button class="tab-button" data-tab="data">Data Context</button>
                    <button class="tab-button" data-tab="principles">Design Principles</button>
                    <button class="tab-button" data-tab="context">Landscape</button>
                    <button class="tab-button" data-tab="technology">Technologies</button>
                    <button class="tab-button" data-tab="engineering">Engineering</button>
                </nav>

                <!-- Tab Content -->
                <div id="business" class="tab-content active">
                    <iframe src="/${solution}/business.html"></iframe>
                </div>

                <div id="product-management" class="tab-content">
                    <iframe src="/${solution}/product-management.html"></iframe>
                </div>

                <div id="capability" class="tab-content">
                    <iframe src="/${solution}/capability.html"></iframe>
                </div>

                <div id="data" class="tab-content">
                    <iframe src="/${solution}/data.html"></iframe>
                </div>

                <div id="principles" class="tab-content">
                    <iframe src="/${solution}/principles.html"></iframe>
                </div>

                <div id="context" class="tab-content">
                    <iframe src="/${solution}/context.html"></iframe>
                </div>

                <div id="technology" class="tab-content">
                    <iframe src="/${solution}/technology.html"></iframe>
                </div>

                <div id="engineering" class="tab-content">
                    <iframe src="/${solution}/engineering.html"></iframe>
                </div>
            </div>
        </main>
    </div>

    <script>
        // Tab functionality
        document.addEventListener('DOMContentLoaded', function() {
            const tabButtons = document.querySelectorAll('.tab-button');
            const tabContents = document.querySelectorAll('.tab-content');
            
            tabButtons.forEach(button => {
                button.addEventListener('click', () => {
                    const targetTab = button.getAttribute('data-tab');
                    
                    // Remove active class from all buttons and contents
                    tabButtons.forEach(btn => btn.classList.remove('active'));
                    tabContents.forEach(content => content.classList.remove('active'));
                    
                    // Add active class to clicked button and corresponding content
                    button.classList.add('active');
                    document.getElementById(targetTab).classList.add('active');
                });
            });
            
            // Handle iframe loading errors
            const iframes = document.querySelectorAll('iframe');
            iframes.forEach(iframe => {
                iframe.addEventListener('error', function() {
                    const container = this.parentElement;
                    container.innerHTML = \`
                        <div style="
                            display: flex; 
                            align-items: center; 
                            justify-content: center; 
                            height: 100%; 
                            color: var(--kv-text-subtle); 
                            text-align: center; 
                            background: var(--kv-bg-content);
                            border: 1px solid var(--kv-border);
                            border-radius: 8px;
                        ">
                            <div>
                                <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;">📄</div>
                                <h3 style="color: var(--kv-text); margin-bottom: 8px;">Content Not Available</h3>
                                <p>This view has not been implemented yet.</p>
                                <p style="margin-top: 16px; font-size: 13px; opacity: 0.7;">
                                    Create the corresponding HTML file in the solution folder to display content here.
                                </p>
                            </div>
                        </div>
                    \`;
                });
            });
        });
    </script>
</body>
</html>`;
    
    res.send(html);
});

app.listen(PORT, () => {
    console.log(`Knowledge Management System running on http://localhost:${PORT}`);
});