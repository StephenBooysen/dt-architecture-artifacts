// Tab functionality for solution pages
document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
    
    // Handle iframe loading errors gracefully
    const iframes = document.querySelectorAll('iframe');
    iframes.forEach(iframe => {
        iframe.addEventListener('error', function() {
            const container = this.parentElement;
            container.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #7f8c8d; text-align: center; padding: 40px;">
                    <div>
                        <h3>Content Not Available</h3>
                        <p>This view has not been implemented yet.</p>
                        <p style="margin-top: 20px; font-size: 0.9rem; opacity: 0.7;">
                            Create the corresponding HTML file in the solution folder to display content here.
                        </p>
                    </div>
                </div>
            `;
        });
        
        iframe.addEventListener('load', function() {
            // Check if iframe loaded successfully
            try {
                if (!this.contentDocument.body.hasChildNodes()) {
                    this.style.display = 'none';
                    const container = this.parentElement;
                    container.innerHTML += `
                        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #7f8c8d; text-align: center; padding: 40px;">
                            <div>
                                <h3>Content Not Available</h3>
                                <p>This view has not been implemented yet.</p>
                                <p style="margin-top: 20px; font-size: 0.9rem; opacity: 0.7;">
                                    Create the corresponding HTML file in the solution folder to display content here.
                                </p>
                            </div>
                        </div>
                    `;
                }
            } catch (e) {
                // Cross-origin restriction, assume content exists
                console.log('Content loaded (cross-origin)');
            }
        });
    });
});