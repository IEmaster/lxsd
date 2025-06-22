// 搜索引擎配置
const searchEngines = {
    bing: 'https://www.bing.com/search?q=',
    google: 'https://www.google.com/search?q=',
    baidu: 'https://www.baidu.com/s?wd=',
    translate: 'https://fanyi.baidu.com/#auto/zh/'
};

// 占位符文本配置
const placeholderTexts = {
    bing: '搜索...',
    google: '搜索...',
    baidu: '搜索...',
    translate: '输入要翻译的文本...'
};

// 当前选择的搜索引擎
let currentEngine = 'bing';

// 全局变量
let links = {};
let categories = [];
let clickStats = {};
let customOrder = {}; // 存储用户自定义的排序

// 简化的暗黑模式管理
const darkModeManager = {
    // 初始化暗黑模式
    init() {
        this.loadTheme();
        this.setupToggleButton();
        this.updateLogo();
    },

    // 加载主题设置
    loadTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        
        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            this.enableDarkMode();
        } else {
            this.enableLightMode();
        }
    },

    // 启用暗黑模式
    enableDarkMode() {
        document.documentElement.classList.add('dark');
        this.updateToggleButton(true);
        this.updateLogo();
    },

    // 启用亮色模式
    enableLightMode() {
        document.documentElement.classList.remove('dark');
        this.updateToggleButton(false);
        this.updateLogo();
    },

    // 切换主题
    toggleTheme() {
        const isDark = document.documentElement.classList.contains('dark');
        if (isDark) {
            this.enableLightMode();
            localStorage.setItem('theme', 'light');
        } else {
            this.enableDarkMode();
            localStorage.setItem('theme', 'dark');
        }
    },

    // 更新切换按钮
    updateToggleButton(isDark) {
        const button = document.getElementById('darkModeToggle');
        if (!button) return;
        
        const icon = button.querySelector('i');
        if (!icon) return;
        
        if (isDark) {
            icon.className = 'fas fa-sun';
            button.title = '切换到亮色模式';
            button.setAttribute('aria-label', '切换到亮色模式');
            button.setAttribute('aria-pressed', 'true');
        } else {
            icon.className = 'fas fa-moon';
            button.title = '切换到暗黑模式';
            button.setAttribute('aria-label', '切换到暗黑模式');
            button.setAttribute('aria-pressed', 'false');
        }
    },

    // 设置切换按钮事件
    setupToggleButton() {
        const button = document.getElementById('darkModeToggle');
        if (button) {
            button.addEventListener('click', () => this.toggleTheme());
        }
    },

    // 更新Logo适应背景
    updateLogo() {
        const logos = document.querySelectorAll('img[src="logo.png"]');
        const isDark = document.documentElement.classList.contains('dark');
        
        logos.forEach(logo => {
            if (isDark) {
                logo.style.filter = 'brightness(0) invert(1)';
            } else {
                logo.style.filter = '';
            }
        });
    }
};

// 渲染所有分类
function renderCategories() {
    const container = document.getElementById('navigationContent');
    if (!container) {
        console.error('找不到navigationContent容器');
        return;
    }
    
    container.innerHTML = '';
    
    if (!categories || categories.length === 0) {
        container.innerHTML = '<div class="col-span-full text-center text-gray-500">暂无分类数据</div>';
        return;
    }
    
    // 获取保存的分类顺序
    const savedOrder = localStorage.getItem('categoriesOrder');
    let sortedCategories;
    
    if (savedOrder) {
        try {
            const orderedCategories = JSON.parse(savedOrder);
            // 确保所有分类都存在
            if (orderedCategories.length === categories.length) {
                sortedCategories = orderedCategories;
            } else {
                // 如果保存的顺序不完整，使用权重排序
                sortedCategories = [...categories].sort((a, b) => {
                    const weightA = a.weight || 0;
                    const weightB = b.weight || 0;
                    return weightB - weightA;
                });
            }
        } catch (error) {
            console.error('加载分类顺序失败:', error);
            sortedCategories = [...categories].sort((a, b) => {
                const weightA = a.weight || 0;
                const weightB = b.weight || 0;
                return weightB - weightA;
            });
        }
    } else {
        // 如果没有保存的顺序，使用权重排序
        sortedCategories = [...categories].sort((a, b) => {
            const weightA = a.weight || 0;
            const weightB = b.weight || 0;
            return weightB - weightA;
        });
    }
    
    // 只在非移动端初始化分类卡片的拖拽排序
    if (window.innerWidth > 768) {
    new Sortable(container, {
        animation: 150,
        handle: '.category-card',
        onEnd: updateCategoriesOrder
    });
    }
    
    sortedCategories.forEach((category, categoryIndex) => {
        const categoryCard = document.createElement('div');
        categoryCard.innerHTML = renderCategory(category, categoryIndex);
        container.appendChild(categoryCard);
        
        // 初始化链接的拖拽功能
        setTimeout(() => {
            initDragAndDrop(category.name, categoryIndex);
        }, 100);
    });
    
    // 渲染常用网站
    renderFrequentSites();
}

// 更新分类排序
function updateCategoriesOrder() {
    const container = document.getElementById('navigationContent');
    const categoryElements = container.querySelectorAll('.category-card');
    const newOrder = Array.from(categoryElements).map(el => {
        const categoryIndex = parseInt(el.dataset.category);
        return categories[categoryIndex];
    });
    
    // 更新分类顺序
    categories = newOrder;
    
    // 保存到本地存储
    localStorage.setItem('categoriesOrder', JSON.stringify(categories));
    
    showToast('分类排序已保存');
}

// 初始化数据
async function initData() {
    try {
        const response = await fetch('data.json');
        console.log('响应状态:', response.status);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('数据加载成功:', data);
        
        // 初始化数据
        categories = data.categories || [];
        clickStats = JSON.parse(localStorage.getItem('clickStats')) || {};
        customOrder = JSON.parse(localStorage.getItem('customOrder')) || {};
        
        // 加载保存的分类顺序
        const savedOrder = localStorage.getItem('categoriesOrder');
        if (savedOrder) {
            try {
                const orderedCategories = JSON.parse(savedOrder);
                // 确保所有分类都存在
                if (orderedCategories.length === categories.length) {
                    categories = orderedCategories;
                }
            } catch (error) {
                console.error('加载分类顺序失败:', error);
            }
        }
        
        // 渲染分类
        renderCategories();
        
        // 初始化搜索功能
        initSearchEvents();
        
        // 初始化占位符
        updateSearchPlaceholder();
        
        // 初始化回到顶部功能
        initScrollToTop();
        
        // 标记数据加载完成
        loadingManager.markLoaded('data');
        
        // 延迟一点时间确保渲染完成
        setTimeout(() => {
            loadingManager.markLoaded('render');
        }, 100);
        
    } catch (error) {
        console.error('加载数据失败:', error);
        const container = document.getElementById('navigationContent');
        if (container) {
            container.innerHTML = `
                <div class="error-message col-span-full text-center p-8">
                    <i class="fas fa-exclamation-circle text-red-500 text-4xl mb-4"></i>
                    <p class="text-red-600 text-lg">加载数据失败，请刷新页面重试</p>
                    <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600">
                        刷新页面
                    </button>
                </div>
            `;
        }
        
        // 即使出错也要隐藏加载屏幕
        loadingManager.markLoaded('data');
        loadingManager.markLoaded('render');
    }
}

// 记录点击
function recordClick(url) {
    clickStats[url] = (clickStats[url] || 0) + 1;
    localStorage.setItem('clickStats', JSON.stringify(clickStats));
    // 立即更新常用网站显示
    renderFrequentSites();
}

// 保存自定义排序
function saveCustomOrder(categoryName, linkUrls) {
    customOrder[categoryName] = linkUrls;
    localStorage.setItem('customOrder', JSON.stringify(customOrder));
}

// 根据自定义排序或点击频率排序链接
function sortLinks(links, categoryName) {
    if (customOrder[categoryName]) {
        // 使用自定义排序
        const orderedLinks = [];
        const remainingLinks = [...links];
        
        customOrder[categoryName].forEach(url => {
            const linkIndex = remainingLinks.findIndex(link => link.url === url);
            if (linkIndex !== -1) {
                orderedLinks.push(remainingLinks.splice(linkIndex, 1)[0]);
            }
        });
        
        // 添加新增的链接到末尾
        return [...orderedLinks, ...remainingLinks];
    } else {
        // 使用点击频率排序
        return links.sort((a, b) => {
            const clicksA = clickStats[a.url] || 0;
            const clicksB = clickStats[b.url] || 0;
            return clicksB - clicksA;
        });
    }
}

// 执行搜索
function performSearch() {
    const searchInput = document.getElementById('searchInput');
    const query = searchInput.value.trim();
    
    if (query) {
        const searchUrl = searchEngines[currentEngine] + encodeURIComponent(query);
        window.open(searchUrl, '_blank');
    }
}

// 切换搜索引擎
function switchSearchEngine(engine) {
    currentEngine = engine;
    
    // 更新按钮状态和aria属性
    document.querySelectorAll('.search-engine-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-pressed', 'false');
    });
    
    const activeBtn = document.querySelector(`[data-engine="${engine}"]`);
    if (activeBtn) {
        activeBtn.classList.add('active');
        activeBtn.setAttribute('aria-pressed', 'true');
    }
    
    // 更新占位符
    updateSearchPlaceholder();
    
    // 更新搜索框的aria-label
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        const engineNames = {
            'bing': 'Bing搜索',
            'google': 'Google搜索',
            'baidu': '百度搜索',
            'translate': '百度翻译'
        };
        searchInput.setAttribute('aria-label', `使用${engineNames[engine] || '搜索引擎'}搜索`);
    }
}

// 更新搜索框占位符
function updateSearchPlaceholder() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.placeholder = placeholderTexts[currentEngine] || '搜索...';
    }
}

// 增强的加载管理器
const loadingManager = {
    checks: {
        dom: false,
        styles: false,
        fonts: false,
        data: false,
        render: false
    },
    
    messages: {
        dom: 'DOM 结构',
        styles: 'CSS 样式',
        fonts: '字体文件',
        data: '数据文件',
        render: '页面渲染'
    },
    
    timeouts: {
        fonts: 8000,      // 字体加载超时8秒
        overall: 10000    // 整体超时10秒
    },
    
    startTime: Date.now(),
    isTimedOut: false,
    
    // 初始化加载管理器
    init() {
        console.log('🚀 开始详细加载检测...');
        this.updateProgress();
        
        // 设置整体超时保护
        setTimeout(() => {
            if (!this.isAllLoaded()) {
                this.handleTimeout();
            }
        }, this.timeouts.overall);
        
        // 检测样式加载
        this.checkStyles().then(() => {
            this.markLoaded('styles');
        });
        
        // 检测字体加载（带超时）
        this.checkFonts().then((result) => {
            this.markLoaded('fonts', result === 'timeout');
        });
    },
    
    // 标记某项已加载
    markLoaded(item, isTimeout = false) {
        if (this.isTimedOut) return;
        
        this.checks[item] = true;
        const loadTime = Date.now() - this.startTime;
        
        if (isTimeout && item === 'fonts') {
            console.log(`⚠️ ${this.messages[item]} 加载超时 (${loadTime}ms)，跳过继续`);
        } else {
            console.log(`✅ ${this.messages[item]} 加载完成 (${loadTime}ms)`);
        }
        
        this.updateProgress();
        this.checkAllLoaded();
    },
    
    // 更新进度条和状态文本
    updateProgress() {
        const total = Object.keys(this.checks).length;
        const loaded = Object.values(this.checks).filter(Boolean).length;
        const progress = (loaded / total) * 100;
        
        // 更新进度条
        const progressFill = document.getElementById('loadingProgressFill');
        if (progressFill) {
            progressFill.style.width = `${progress}%`;
            progressFill.parentElement.parentElement.setAttribute('aria-valuenow', progress);
        }
        
        // 更新状态文本
        const loadingText = document.getElementById('loadingText');
        const loadingDetails = document.getElementById('loadingDetails');
        
        if (loadingText && loadingDetails) {
            if (progress === 100) {
                loadingText.textContent = '加载完成！';
                loadingDetails.innerHTML = '<span class="text-sm opacity-75 text-green-400">✨ 正在启动应用...</span>';
            } else {
                const pendingItems = Object.entries(this.checks)
                    .filter(([key, value]) => !value)
                    .map(([key]) => this.messages[key]);
                
                loadingText.textContent = `正在加载资源... ${loaded}/${total}`;
                
                if (pendingItems.length > 0) {
                    const currentItem = pendingItems[0];
                    const emoji = this.getLoadingEmoji(currentItem);
                    loadingDetails.innerHTML = `<span class="text-sm opacity-75">${emoji} 加载中: ${currentItem}</span>`;
                }
            }
        }
    },
    
    // 获取加载状态的emoji
    getLoadingEmoji(item) {
        const emojiMap = {
            'DOM 结构': '🏗️',
            'CSS 样式': '🎨',
            '字体文件': '🔤',
            '数据文件': '📊',
            '页面渲染': '✨'
        };
        return emojiMap[item] || '⏳';
    },
    
    // 检查是否所有项目都已加载
    checkAllLoaded() {
        if (this.isTimedOut) return;
        
        const allLoaded = this.isAllLoaded();
        if (allLoaded) {
            const totalTime = Date.now() - this.startTime;
            console.log(`🎉 所有资源加载完成，总耗时: ${totalTime}ms`);
            this.hideLoadingScreen();
        }
    },
    
    // 检查是否全部加载完成
    isAllLoaded() {
        return Object.values(this.checks).every(loaded => loaded);
    },
    
    // 处理超时情况
    handleTimeout() {
        if (this.isAllLoaded()) return;
        
        this.isTimedOut = true;
        const totalTime = Date.now() - this.startTime;
        
        console.warn(`🚨 加载超时 (${totalTime}ms)，强制进入页面`);
        
        // 标记所有未完成项为已完成
        Object.keys(this.checks).forEach(item => {
            if (!this.checks[item]) {
                this.checks[item] = true;
            }
        });
        
        // 显示超时提示
        const loadingText = document.getElementById('loadingText');
        const loadingDetails = document.getElementById('loadingDetails');
        
        if (loadingText && loadingDetails) {
            loadingText.textContent = '加载超时，强制进入';
            loadingDetails.innerHTML = '<span class="text-sm opacity-75 text-yellow-400">⚠️ 网络较慢，已强制进入页面</span>';
        }
        
        // 1秒后隐藏加载屏幕
        setTimeout(() => {
            this.hideLoadingScreen();
            
            // 显示用户友好的提示
            setTimeout(() => {
                this.showTimeoutToast();
            }, 500);
        }, 1000);
    },
    
    // 显示超时提示
    showTimeoutToast() {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 bg-yellow-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center space-x-2';
        toast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>网络加载较慢，部分功能可能需要稍等</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100%)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    },
    
    // 平缓隐藏加载屏幕
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loadingScreen');
        if (loadingScreen) {
            // 更新最终状态
            const progressFill = document.getElementById('loadingProgressFill');
            if (progressFill) {
                progressFill.style.width = '100%';
            }
            
            // 添加淡出类，CSS过渡会处理动画
            loadingScreen.classList.add('fade-out');
            
            // 在动画完成后移除元素
            setTimeout(() => {
                if (loadingScreen.parentNode) {
                    loadingScreen.style.display = 'none';
                }
            }, 800); // 与CSS过渡时间一致
        }
    },
    
    // 检测CSS样式是否加载完成
    checkStyles() {
        return new Promise((resolve) => {
            const links = document.querySelectorAll('link[rel="stylesheet"]');
            let loadedCount = 0;
            const totalLinks = links.length;
            
            if (totalLinks === 0) {
                resolve();
                return;
            }
            
            const checkLoaded = () => {
                loadedCount++;
                if (loadedCount === totalLinks) {
                    resolve();
                }
            };
            
            links.forEach((link) => {
                if (link.sheet) {
                    checkLoaded();
                } else {
                    link.addEventListener('load', checkLoaded);
                    link.addEventListener('error', checkLoaded);
                }
            });
        });
    },
    
    // 检测字体是否加载完成（带超时）
    checkFonts() {
        return new Promise((resolve) => {
            let isResolved = false;
            
            const resolveOnce = (result) => {
                if (!isResolved) {
                    isResolved = true;
                    resolve(result);
                }
            };
            
            // 字体加载检测
            if (document.fonts && document.fonts.ready) {
                document.fonts.ready.then(() => {
                    resolveOnce('completed');
                }).catch(() => {
                    resolveOnce('completed');
                });
            } else {
                // 备用方案
                setTimeout(() => {
                    resolveOnce('completed');
                }, 1000);
            }
            
            // 字体加载超时
            setTimeout(() => {
                resolveOnce('timeout');
            }, this.timeouts.fonts);
        });
    }
};

// 初始化数据后隐藏加载屏幕
function hideLoadingScreen() {
    const loadingScreen = document.getElementById('loadingScreen');
    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }
}

// 切换分类展开/收起
function toggleCategory(categoryIndex) {
    const container = document.querySelector(`[data-category="${categoryIndex}"] .links-container`);
    const toggleBtn = document.querySelector(`[data-category="${categoryIndex}"] .toggle-btn i`);
    const linkItems = container.querySelectorAll('.link-item');
    
    if (!container || !toggleBtn) return;
    
    const isExpanded = container.classList.contains('expanded');
    
    if (isExpanded) {
        container.classList.remove('expanded');
        toggleBtn.classList.remove('fa-chevron-up');
        toggleBtn.classList.add('fa-chevron-down');
        
        // 隐藏多余的链接
        linkItems.forEach((item, index) => {
            if (index >= 4) {
                item.classList.add('hidden-link');
            }
        });
    } else {
        container.classList.add('expanded');
        toggleBtn.classList.remove('fa-chevron-down');
        toggleBtn.classList.add('fa-chevron-up');
        
        // 显示所有链接
        linkItems.forEach(item => {
            item.classList.remove('hidden-link');
        });
    }
}

// 渲染分类
function renderCategory(category, categoryIndex) {
    // 获取保存的链接顺序
    const savedOrder = localStorage.getItem('customOrder');
    let sortedLinks;
    
    if (savedOrder) {
        try {
            const customOrder = JSON.parse(savedOrder);
            if (customOrder[category.name]) {
                // 使用自定义排序
                const orderedLinks = [];
                const remainingLinks = [...category.links];
                
                customOrder[category.name].forEach(url => {
                    const linkIndex = remainingLinks.findIndex(link => link.url === url);
                    if (linkIndex !== -1) {
                        orderedLinks.push(remainingLinks.splice(linkIndex, 1)[0]);
                    }
                });
                
                // 添加新增的链接到末尾
                sortedLinks = [...orderedLinks, ...remainingLinks];
            } else {
                // 如果没有该分类的自定义排序，使用权重排序
                sortedLinks = [...category.links].sort((a, b) => {
                    const weightA = a.weight || 0;
                    const weightB = b.weight || 0;
                    return weightB - weightA;
                });
            }
        } catch (error) {
            console.error('加载链接顺序失败:', error);
            sortedLinks = [...category.links].sort((a, b) => {
                const weightA = a.weight || 0;
                const weightB = b.weight || 0;
                return weightB - weightA;
            });
        }
    } else {
        // 如果没有保存的顺序，使用权重排序
        sortedLinks = [...category.links].sort((a, b) => {
            const weightA = a.weight || 0;
            const weightB = b.weight || 0;
            return weightB - weightA;
        });
    }
    
    const hasMoreThanFour = sortedLinks.length > 4;
    
    return `
        <div class="category-card" data-category="${categoryIndex}">
            <h2 class="text-xl font-bold text-gray-800 mb-4 flex items-center justify-between">
                ${category.name}
                <div class="flex items-center gap-2">
                    ${hasMoreThanFour ? `
                        <button onclick="toggleCategory(${categoryIndex})" 
                                class="toggle-btn text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md transition-colors"
                                title="展开/收起">
                            <i class="fas fa-chevron-down"></i>
                        </button>
                    ` : ''}
                    <button onclick="resetOrder('${category.name}', ${categoryIndex})" 
                            class="reset-btn text-blue-500 hover:text-blue-600 text-sm"
                            title="重置排序">
                        <i class="fas fa-undo"></i>
                    </button>
                </div>
            </h2>
            <div class="links-container" id="category-${categoryIndex}">
                ${sortedLinks.map((link, linkIndex) => {
                    const isHidden = hasMoreThanFour && linkIndex >= 4;
                    return renderLink(link, categoryIndex, linkIndex, isHidden);
                }).join('')}
            </div>
        </div>
    `;
}

// 显示提示消息
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        if (document.body.contains(toast)) {
            document.body.removeChild(toast);
        }
    }, 2000);
}

// 重置分类排序
function resetOrder(categoryName, categoryIndex) {
    delete customOrder[categoryName];
    localStorage.setItem('customOrder', JSON.stringify(customOrder));
    
    // 保存当前展开状态
    const linksContainer = document.querySelector(`[data-category="${categoryIndex}"] .links-container`);
    const isExpanded = linksContainer && linksContainer.classList.contains('expanded');
    
    // 重新渲染分类
    const category = categories[categoryIndex];
    const container = document.getElementById(`category-${categoryIndex}`);
    const hasMoreThanFour = category.links.length > 4;
    
    // 重新渲染链接，并正确应用hidden-link类
    container.innerHTML = category.links.map((link, linkIndex) => {
        const isHidden = hasMoreThanFour && linkIndex >= 4 && !isExpanded;
        return renderLink(link, categoryIndex, linkIndex, isHidden);
    }).join('');
    
    // 重新初始化拖拽
    initDragAndDrop(category.name, categoryIndex);
    
    // 恢复展开状态
    if (isExpanded) {
        container.classList.add('expanded');
        const toggleBtn = document.querySelector(`[data-category="${categoryIndex}"] .toggle-btn i`);
        if (toggleBtn) {
            toggleBtn.classList.remove('fa-chevron-down');
            toggleBtn.classList.add('fa-chevron-up');
        }
    }
    
    showToast('排序已重置');
}

// 获取域名
function getDomainFromUrl(url) {
    try {
        return new URL(url).hostname.replace('www.', '');
    } catch {
        return 'default';
    }
}

// 渲染链接项
function renderLink(link, categoryIndex, linkIndex, isHidden = false) {
    const domain = getDomainFromUrl(link.url);
    const hiddenClass = isHidden ? 'hidden-link' : '';
    
    return `
        <div class="link-item ${hiddenClass}" draggable="true" data-url="${link.url}">
            <a href="${link.url}" target="_blank" class="site-link" onclick="recordClick('${link.url}')">
                <div class="site-icon-container">
                    <img src="https://favicon.im/${domain}" alt="${link.name}" class="site-icon"
                         onerror="this.src='images/default.png'">
                </div>
                <div class="site-info">
                    <h3>${link.name}</h3>
                    <p>${link.description}</p>
                </div>
            </a>
            <div class="drag-handle" title="拖拽重新排序">
                <i class="fas fa-grip-vertical"></i>
            </div>
            <button class="copy-btn" title="复制网址" onclick="copyUrl('${link.url}')">
                <i class="fas fa-copy"></i>
            </button>
        </div>
    `;
}

// 添加复制URL的函数
function copyUrl(url) {
    navigator.clipboard.writeText(url).then(() => {
        showToast('网址已复制到剪贴板');
    }).catch(err => {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制');
    });
}

// 初始化拖拽功能
function initDragAndDrop(categoryName, categoryIndex) {
    const container = document.getElementById(`category-${categoryIndex}`);
    if (!container || typeof Sortable === 'undefined') return;
    
    // 只在非移动端初始化链接的拖拽功能
    if (window.innerWidth > 768) {
    new Sortable(container, {
        animation: 150,
        handle: '.drag-handle',
        onEnd: () => updateOrder(categoryName, categoryIndex)
    });
    }
}

// 更新排序
function updateOrder(categoryName, categoryIndex) {
    const container = document.getElementById(`category-${categoryIndex}`);
    const linkElements = container.querySelectorAll('.link-item');
    const newOrder = Array.from(linkElements).map(el => el.dataset.url);
    
    saveCustomOrder(categoryName, newOrder);
    showToast('排序已保存');
}

// 回到顶部
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 监听滚动事件，控制回到顶部按钮显示（节流处理）
const handleScroll = throttle(() => {
    const backToTopBtn = document.getElementById('backToTop');
    if (!backToTopBtn) return;
    
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    if (scrollTop > 300) {
        backToTopBtn.classList.add('show');
    } else {
        backToTopBtn.classList.remove('show');
    }
}, 100);

// 初始化搜索事件
function initSearchEvents() {
    // 添加搜索框回车事件
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    // 添加搜索引擎按钮点击事件
    document.querySelectorAll('.search-engine-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const engine = btn.getAttribute('data-engine');
            switchSearchEngine(engine);
        });
    });
}

// 初始化回到顶部功能
function initScrollToTop() {
    // 添加回到顶部按钮点击事件
    const backToTopBtn = document.getElementById('backToTop');
    if (backToTopBtn) {
        backToTopBtn.addEventListener('click', scrollToTop);
    }
    
    // 添加节流后的滚动监听
    window.addEventListener('scroll', handleScroll);
}

// 渲染常用网站
function renderFrequentSites() {
    const container = document.getElementById('frequentSites');
    if (!container) return;

    // 获取点击次数最多的网站
    const sortedSites = Object.entries(clickStats)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([url]) => {
            // 在所有分类中查找匹配的网站
            for (const category of categories) {
                const site = category.links.find(link => link.url === url);
                if (site) return site;
            }
            return null;
        })
        .filter(Boolean);

    if (sortedSites.length === 0) {
        container.innerHTML = `
            <div class="frequent-sites-card">
                <h2>
                    <i class="fas fa-star"></i>
                    常用网站
                </h2>
                <div class="text-center text-gray-500 py-4">
                    <i class="fas fa-mouse-pointer text-2xl mb-2 opacity-50"></i>
                    <p>点击任意网站链接后，常用网站会显示在这里</p>
                </div>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <div class="frequent-sites-card">
            <div class="flex justify-between items-center mb-4">
                <h2>
                    <i class="fas fa-star"></i>
                    常用网站
                </h2>
                <button onclick="clearFrequentSites()" class="text-sm text-gray-500 hover:text-red-500 transition-colors">
                    <i class="fas fa-trash-alt mr-1"></i>
                    清空记录
                </button>
            </div>
            <div class="frequent-sites-grid">
                ${sortedSites.map(site => renderFrequentSiteItem(site)).join('')}
            </div>
        </div>
    `;

    // 更新显示状态
    updateFrequentSitesVisibility();
}

// 清空常用网站记录
function clearFrequentSites() {
    if (confirm('确定要清空常用网站记录吗？')) {
        clickStats = {};
        localStorage.setItem('clickStats', JSON.stringify(clickStats));
        renderFrequentSites();
        showToast('常用网站记录已清空');
    }
}

// 渲染单个常用网站项
function renderFrequentSiteItem(site) {
    const domain = getDomainFromUrl(site.url);
    return `
        <a href="${site.url}" class="frequent-site-item" target="_blank" rel="noopener noreferrer" onclick="recordClick('${site.url}')">
            <div class="frequent-icon-container">
                <img src="https://favicon.im/${domain}" 
                     alt="${site.name}" 
                     class="frequent-site-icon"
                     onerror="this.src='images/default.png'">
            </div>
            <div class="flex flex-col">
                <span class="text-sm">${site.name}</span>
                <span class="text-xs">${domain}</span>
            </div>
        </a>
    `;
}

// 更新常用网站显示状态
function updateFrequentSitesVisibility() {
    const grid = document.querySelector('.frequent-sites-grid');
    if (!grid) return;

    const items = grid.querySelectorAll('.frequent-site-item');
    const gridWidth = grid.clientWidth;
    let currentWidth = 0;
    const itemWidth = 160; // 每个项目的宽度
    const gap = 12; // 项目之间的间距

    items.forEach(item => {
        // 重置所有项目的可见性
        item.style.opacity = '1';
        item.style.visibility = 'visible';
        
        // 计算当前项目的位置
        const itemRight = currentWidth + itemWidth;
        
        // 如果项目超出容器宽度，则隐藏
        if (itemRight > gridWidth) {
            item.style.opacity = '0';
            item.style.visibility = 'hidden';
        }
        
        currentWidth += itemWidth + gap;
    });
}

// 监听窗口大小变化
window.addEventListener('resize', debounce(updateFrequentSitesVisibility, 100));

// 在加载完成后初始化显示
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    updateFrequentSitesVisibility();
});

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('📄 DOM 加载完成，开始初始化...');
    
    // 标记DOM加载完成
    loadingManager.markLoaded('dom');
    
    // 初始化加载管理器
    loadingManager.init();
    
    // 初始化暗黑模式
    darkModeManager.init();
    
    // 初始化数据
    initData();
});

// 确保在页面完全加载后也能初始化（兼容性处理）
window.addEventListener('load', function() {
    console.log('🔄 检查是否需要备用初始化...');
    
    // 如果DOM还没有初始化，则进行初始化
    const container = document.getElementById('navigationContent');
    if (container && !container.innerHTML.trim()) {
        console.log('🔧 执行备用初始化...');
        loadingManager.markLoaded('dom');
        loadingManager.init();
        darkModeManager.init();
        initData();
    }
});

// 常用网站显示控制
const frequentSitesManager = {
    init() {
        this.loadVisibility();
        this.setupToggleButton();
    },

    loadVisibility() {
        const savedVisibility = localStorage.getItem('frequentSitesVisible');
        const isVisible = savedVisibility === null ? true : savedVisibility === 'true';
        this.setVisibility(isVisible);
    },

    setVisibility(isVisible) {
        const container = document.getElementById('frequentSites');
        if (container) {
            container.style.display = isVisible ? 'block' : 'none';
        }
        this.updateToggleButton(isVisible);
    },

    toggleVisibility() {
        const isVisible = document.getElementById('frequentSites').style.display !== 'none';
        this.setVisibility(!isVisible);
        localStorage.setItem('frequentSitesVisible', (!isVisible).toString());
    },

    updateToggleButton(isVisible) {
        const button = document.getElementById('frequentSitesToggle');
        if (!button) return;
        
        const icon = button.querySelector('i');
        if (!icon) return;
        
        if (isVisible) {
            icon.className = 'fas fa-star';
            button.title = '隐藏常用网站';
            button.setAttribute('aria-label', '隐藏常用网站');
            button.setAttribute('aria-pressed', 'true');
        } else {
            icon.className = 'far fa-star';
            button.title = '显示常用网站';
            button.setAttribute('aria-label', '显示常用网站');
            button.setAttribute('aria-pressed', 'false');
        }
    },

    setupToggleButton() {
        const button = document.getElementById('frequentSitesToggle');
        if (button) {
            button.addEventListener('click', () => this.toggleVisibility());
        }
    }
};

// 在加载完成后初始化显示
document.addEventListener('DOMContentLoaded', () => {
    // ... existing code ...
    frequentSitesManager.init();
});

// 添加窗口大小改变事件监听
window.addEventListener('resize', () => {
    // 重新渲染分类以更新拖拽功能
    renderCategories();
}); 