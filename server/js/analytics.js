// ==================== ANALYTICS MANAGER ====================
// Handles Chart.js visualizations for study analytics

export const AnalyticsManager = {
    // Store chart instances
    activityChart: null,
    skillsChart: null,

    /**
     * Initialize analytics charts
     */
    init() {
        console.log('📊 AnalyticsManager: Initializing...');
        
        // Check if Chart.js is loaded
        if (typeof Chart === 'undefined') {
            console.error('❌ Chart.js not loaded!');
            return;
        }

        console.log('✅ Chart.js detected, version:', Chart.version);

        // Render charts with real data
        this.renderActivityChart();
        this.renderSkillsChart();

        // Expose to window for debugging and external updates
        window.AnalyticsManager = this;
        console.log('✅ AnalyticsManager initialized successfully');
    },

    /**
     * Get study time data for the current week (Mon-Sun)
     * @returns {Array} Array of 7 numbers representing hours per day
     */
    getStudyTimeData() {
        console.log('📊 Fetching study time data from localStorage...');
        
        try {
            // Check for study logs in localStorage
            const studyLogs = localStorage.getItem('whalio_study_logs');
            
            if (!studyLogs) {
                console.warn('⚠️ No study logs found, using fallback data');
                return [0, 0, 0, 0, 0, 0, 0];
            }

            const logs = JSON.parse(studyLogs);
            console.log('📖 Study logs loaded:', logs);

            // Get current week's Monday
            const today = new Date();
            const currentDay = today.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
            const mondayOffset = currentDay === 0 ? -6 : 1 - currentDay; // Adjust for Sunday
            const monday = new Date(today);
            monday.setDate(today.getDate() + mondayOffset);
            monday.setHours(0, 0, 0, 0);

            // Initialize array for 7 days (Mon-Sun)
            const weekData = [0, 0, 0, 0, 0, 0, 0];

            // Process logs
            logs.forEach(log => {
                const logDate = new Date(log.date);
                const daysSinceMonday = Math.floor((logDate - monday) / (1000 * 60 * 60 * 24));
                
                // If log is within current week
                if (daysSinceMonday >= 0 && daysSinceMonday < 7) {
                    weekData[daysSinceMonday] += log.hours || 0;
                }
            });

            console.log('✅ Week study data calculated:', weekData);
            return weekData;

        } catch (error) {
            console.error('❌ Error fetching study time data:', error);
            // Fallback to empty week
            return [0, 0, 0, 0, 0, 0, 0];
        }
    },

    /**
     * Get GPA/subject performance data from REAL GPA Calculator
     * @returns {Object} Object with labels and data arrays
     */
    getGPAData() {
        console.log('📊 Fetching REAL GPA data from localStorage...');
        
        try {
            // Use the ACTUAL storage key from gpa-calculator.js
            const gpaData = localStorage.getItem('my_semester_grades');
            
            if (!gpaData) {
                console.warn('⚠️ No GPA data found in my_semester_grades, checking fallback keys...');
                
                // Try alternative keys as fallback
                const fallbackData = localStorage.getItem('whalio_gpa') || localStorage.getItem('gpa_data');
                if (fallbackData) {
                    return this.parseFallbackGPAData(fallbackData);
                }
                
                console.warn('⚠️ No GPA data found, using empty chart');
                return {
                    labels: ['Chưa có dữ liệu'],
                    data: [0]
                };
            }

            const subjects = JSON.parse(gpaData);
            console.log('📖 Raw GPA subjects loaded:', subjects);

            if (!Array.isArray(subjects) || subjects.length === 0) {
                console.warn('⚠️ GPA data is empty or invalid');
                return {
                    labels: ['Chưa có dữ liệu'],
                    data: [0]
                };
            }

            // Extract completed subjects with valid scores
            const validSubjects = [];

            subjects.forEach(subject => {
                // Calculate final score from components
                const finalScore = this.calculateFinalScore(subject.components);
                
                // Only include subjects with:
                // 1. Valid name
                // 2. Final score > 0
                // 3. All components have scores (complete subject)
                if (subject.name && 
                    subject.name.trim() !== '' && 
                    finalScore > 0 && 
                    this.isSubjectComplete(subject.components)) {
                    
                    validSubjects.push({
                        name: subject.name.trim(),
                        score: finalScore
                    });
                }
            });

            console.log('✅ Valid subjects extracted:', validSubjects);

            // If no valid subjects, show empty state
            if (validSubjects.length === 0) {
                console.warn('⚠️ No completed subjects found');
                return {
                    labels: ['Chưa có môn nào'],
                    data: [0]
                };
            }

            // Limit to top 8 subjects (to avoid cluttering the chart)
            const limitedSubjects = validSubjects.slice(0, 8);

            // Extract labels and data
            const labels = limitedSubjects.map(s => s.name);
            const data = limitedSubjects.map(s => s.score);

            console.log('✅ GPA chart data prepared:', { labels, data });
            return { labels, data };

        } catch (error) {
            console.error('❌ Error fetching GPA data:', error);
            return {
                labels: ['Lỗi dữ liệu'],
                data: [0]
            };
        }
    },

    /**
     * Calculate final score from components (same logic as gpa-calculator.js)
     * @param {Array} components - Array of {score, weight}
     * @returns {number} Final score (0-10 scale)
     */
    calculateFinalScore(components) {
        if (!components || !Array.isArray(components)) return 0;
        
        let totalScore = 0;
        
        for (const comp of components) {
            if (comp.score !== null && comp.score !== '' && !isNaN(parseFloat(comp.score))) {
                const score = parseFloat(comp.score);
                const weight = parseFloat(comp.weight) || 0;
                totalScore += (score * weight / 100);
            }
        }
        
        return Math.round(totalScore * 10) / 10;
    },

    /**
     * Check if subject is complete (all components have scores and weights sum to 100)
     * @param {Array} components - Array of {score, weight}
     * @returns {boolean}
     */
    isSubjectComplete(components) {
        if (!components || !Array.isArray(components)) return false;
        
        // Calculate total weight
        const totalWeight = components.reduce((sum, comp) => {
            const weight = parseFloat(comp.weight);
            return sum + (isNaN(weight) ? 0 : weight);
        }, 0);

        // Weight must sum to 100 (with small tolerance for floating point)
        if (Math.abs(totalWeight - 100) > 0.01) {
            return false;
        }

        // All components must have valid scores
        return components.every(comp => {
            const score = parseFloat(comp.score);
            return !isNaN(score) && score !== null && score !== '';
        });
    },

    /**
     * Parse fallback GPA data formats (for backwards compatibility)
     * @param {string} fallbackData - JSON string
     * @returns {Object} {labels, data}
     */
    parseFallbackGPAData(fallbackData) {
        try {
            const parsed = JSON.parse(fallbackData);
            const labels = [];
            const data = [];

            if (Array.isArray(parsed)) {
                parsed.forEach(subject => {
                    if (subject.name && subject.score !== undefined) {
                        labels.push(subject.name);
                        data.push(parseFloat(subject.score) || 0);
                    }
                });
            } else if (typeof parsed === 'object') {
                Object.keys(parsed).forEach(key => {
                    if (typeof parsed[key] === 'number' || !isNaN(parsed[key])) {
                        labels.push(key);
                        data.push(parseFloat(parsed[key]) || 0);
                    }
                });
            }

            return labels.length > 0 ? { labels, data } : { labels: ['Chưa có dữ liệu'], data: [0] };
        } catch (error) {
            console.error('❌ Error parsing fallback GPA data:', error);
            return { labels: ['Lỗi dữ liệu'], data: [0] };
        }
    },

    /**
     * Render Activity Chart (Bar Chart)
     * Shows hours studied in the last 7 days (REAL DATA)
     */
    renderActivityChart() {
        console.log('📊 Rendering Activity Chart...');
        
        const canvas = document.getElementById('activityChart');
        if (!canvas) {
            console.error('❌ Activity chart canvas not found!');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.activityChart) {
            this.activityChart.destroy();
        }

        // Get real data from localStorage
        const weekData = this.getStudyTimeData();
        const maxHours = Math.max(...weekData, 6); // Dynamic max based on data

        this.activityChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'],
                datasets: [{
                    label: 'Giờ học',
                    data: weekData,
                    backgroundColor: 'rgba(139, 92, 246, 0.6)',
                    borderColor: 'rgba(139, 92, 246, 1)',
                    borderWidth: 2,
                    borderRadius: 6,
                    borderSkipped: false
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return context.parsed.y + ' giờ';
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: Math.ceil(maxHours / 2) * 2, // Round up to nearest even number
                        ticks: {
                            stepSize: 2,
                            font: {
                                size: 11
                            },
                            color: '#6b7280',
                            callback: function(value) {
                                return value + 'h';
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11,
                                weight: '600'
                            },
                            color: '#1f2937'
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            }
        });

        console.log('✅ Activity Chart rendered with data:', weekData);
    },

    /**
     * Render Skills Chart (Radar Chart)
     * Shows subject performance ratings (REAL DATA)
     */
    renderSkillsChart() {
        console.log('📊 Rendering Skills Chart...');
        
        const canvas = document.getElementById('skillsChart');
        if (!canvas) {
            console.error('❌ Skills chart canvas not found!');
            return;
        }

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart if any
        if (this.skillsChart) {
            this.skillsChart.destroy();
        }

        // Get real GPA data from localStorage
        const gpaData = this.getGPAData();

        this.skillsChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: gpaData.labels,
                datasets: [{
                    label: 'Điểm năng lực',
                    data: gpaData.data,
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    borderColor: 'rgba(245, 158, 11, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(245, 158, 11, 1)',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(245, 158, 11, 1)',
                    pointHoverBorderWidth: 3
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        },
                        callbacks: {
                            label: function(context) {
                                return 'Điểm: ' + context.parsed.r + '/10';
                            }
                        }
                    }
                },
                scales: {
                    r: {
                        min: 0,
                        max: 10,
                        ticks: {
                            stepSize: 2,
                            font: {
                                size: 10
                            },
                            color: '#6b7280',
                            backdropColor: 'transparent'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.08)'
                        },
                        angleLines: {
                            color: 'rgba(0, 0, 0, 0.08)'
                        },
                        pointLabels: {
                            font: {
                                size: 12,
                                weight: '600'
                            },
                            color: '#1f2937'
                        }
                    }
                }
            }
        });

        console.log('✅ Skills Chart rendered with data:', gpaData);
    },

    /**
     * Update activity chart with new data
     * @param {Array} data - Array of 7 numbers representing hours per day
     */
    updateActivityData(data) {
        if (!this.activityChart) {
            console.error('❌ Activity chart not initialized');
            return;
        }

        this.activityChart.data.datasets[0].data = data;
        this.activityChart.update();
        console.log('✅ Activity chart updated with new data');
    },

    /**
     * Update skills chart with new data
     * @param {Array} data - Array of 6 numbers representing subject scores
     */
    updateSkillsData(data) {
        if (!this.skillsChart) {
            console.error('❌ Skills chart not initialized');
            return;
        }

        this.skillsChart.data.datasets[0].data = data;
        this.skillsChart.update();
        console.log('✅ Skills chart updated with new data');
    },

    /**
     * Refresh all charts with latest data from localStorage
     * Call this after user adds GPA scores or completes study session
     */
    updateCharts() {
        console.log('🔄 Updating all charts with fresh data...');
        
        // Destroy and re-render activity chart
        if (this.activityChart) {
            this.activityChart.destroy();
            this.activityChart = null;
        }
        this.renderActivityChart();

        // Destroy and re-render skills chart
        if (this.skillsChart) {
            this.skillsChart.destroy();
            this.skillsChart = null;
        }
        this.renderSkillsChart();

        console.log('✅ All charts refreshed successfully');
    }
};
