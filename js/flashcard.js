// ==================== FLASHCARD MANAGER ====================
// Handles flashcard deck management with localStorage (Quizlet-style)

export const FlashcardManager = {
    decks: [],
    currentDeckId: null,
    currentCardIndex: 0,
    STORAGE_KEY: 'whalio_flashcard_decks',

    /**
     * Initialize flashcard system
     */
    init() {
        console.log('📚 FlashcardManager: Initializing...');
        
        // Load decks from localStorage
        this.loadDecks();
        
        // Render decks to UI
        this.renderDecks();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Expose to window
        window.FlashcardManager = this;
        console.log('✅ FlashcardManager initialized successfully');
    },

    /**
     * Load decks from localStorage or use default data
     */
    loadDecks() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        
        if (stored) {
            try {
                this.decks = JSON.parse(stored);
                console.log('📖 Flashcard decks loaded from localStorage:', this.decks);
            } catch (error) {
                console.error('❌ Error loading flashcard decks:', error);
                this.decks = this.getDefaultDecks();
            }
        } else {
            console.log('⚠️ No flashcard data found, using default decks');
            this.decks = this.getDefaultDecks();
            this.saveDecks();
        }
    },

    /**
     * Get default flashcard decks (mock data with emoji icons)
     */
    getDefaultDecks() {
        console.log('📦 Loading default flashcard decks...');
        return [
            {
                id: Date.now() + 1,
                title: "Tiếng Anh Cơ Bản",
                icon: "🇬🇧",
                color: "blue",
                cards: [
                    { term: "Hello", def: "Xin chào" },
                    { term: "Goodbye", def: "Tạm biệt" },
                    { term: "Thank you", def: "Cảm ơn" },
                    { term: "Please", def: "Làm ơn" },
                    { term: "Excuse me", def: "Xin lỗi" }
                ]
            },
            {
                id: Date.now() + 2,
                title: "Thuật Ngữ Luật",
                icon: "⚖️",
                color: "purple",
                cards: [
                    { term: "Hiến pháp", def: "Đạo luật cơ bản và tối cao của quốc gia" },
                    { term: "Hợp đồng", def: "Thỏa thuận giữa các bên về quyền và nghĩa vụ" },
                    { term: "Bồi thường", def: "Bồi hoàn thiệt hại do hành vi trái pháp luật" },
                    { term: "Trách nhiệm hình sự", def: "Trách nhiệm pháp lý của người phạm tội" }
                ]
            },
            {
                id: Date.now() + 3,
                title: "Công Thức Toán",
                icon: "🔢",
                color: "green",
                cards: [
                    { term: "Pythagore", def: "a² + b² = c²" },
                    { term: "Diện tích hình tròn", def: "S = πr²" },
                    { term: "Đạo hàm x²", def: "d/dx(x²) = 2x" },
                    { term: "Tổ hợp C(n,k)", def: "n! / (k!(n-k)!)" }
                ]
            },
            {
                id: Date.now() + 4,
                title: "Lịch Sử Việt Nam",
                icon: "🇻🇳",
                color: "red",
                cards: [
                    { term: "Cách mạng Tháng Tám", def: "Năm 1945" },
                    { term: "Tuyên ngôn Độc lập", def: "Chủ tịch Hồ Chí Minh đọc" },
                    { term: "Chiến thắng Điện Biên Phủ", def: "7/5/1954" },
                    { term: "Thống nhất đất nước", def: "30/4/1975" }
                ]
            }
        ];
    },

    /**
     * Save decks to localStorage
     */
    saveDecks() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.decks));
        console.log('💾 Flashcard decks saved to localStorage');
    },

    /**
     * Render flashcard decks to UI
     */
    renderDecks() {
        console.log('🎨 Rendering flashcard decks...');
        
        const container = document.getElementById('flashcard-scroll-container');
        if (!container) {
            console.error('❌ Flashcard carousel container not found!');
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Render each deck
        this.decks.forEach(deck => {
            const deckCard = this.createDeckCard(deck);
            container.appendChild(deckCard);
        });

        console.log(`✅ Rendered ${this.decks.length} flashcard decks`);
    },

    /**
     * Create a deck card element (with emoji icon instead of img)
     */
    createDeckCard(deck) {
        console.log('🎴 Creating deck card:', deck.title);
        
        const card = document.createElement('div');
        card.className = 'flashcard-item';
        card.onclick = () => this.openStudyModal(deck.id);
        
        // Add fallbacks for undefined icon and color
        const icon = deck.icon || '📝';
        const color = deck.color || 'blue';
        
        card.innerHTML = `
            <div class="deck-icon bg-${color}">${icon}</div>
            <div class="deck-info">
                <h4>${deck.title}</h4>
                <p>${deck.cards.length} thẻ</p>
            </div>
        `;
        
        return card;
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Close modal on click outside
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeStudyModal();
                }
            });
        }
    },

    /**
     * Open study modal for a specific deck
     */
    openStudyModal(deckId) {
        console.log('📖 Opening study modal for deck:', deckId);
        
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) {
            console.error('❌ Deck not found:', deckId);
            return;
        }

        if (!deck.cards || deck.cards.length === 0) {
            alert('Bộ thẻ này chưa có flashcard nào!');
            return;
        }

        this.currentDeckId = deckId;
        this.currentCardIndex = 0;

        // Update modal title
        const modalTitle = document.getElementById('studyModalTitle');
        if (modalTitle) {
            modalTitle.textContent = deck.title;
        }

        // Render first card
        this.renderCurrentCard();

        // Show modal
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.classList.add('active');
        }

        console.log('✅ Study modal opened');
    },

    /**
     * Close study modal
     */
    closeStudyModal() {
        console.log('❌ Closing study modal');
        
        const modal = document.getElementById('studyModal');
        if (modal) {
            modal.classList.remove('active');
        }

        // Reset flip state
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer) {
            cardContainer.classList.remove('flipped');
        }

        this.currentDeckId = null;
        this.currentCardIndex = 0;
    },

    /**
     * Scroll the flashcard carousel left or right
     */
    scrollDecks(direction) {
        const container = document.getElementById('flashcard-scroll-container');
        if (!container) {
            console.warn('⚠️ Carousel container not found');
            return;
        }

        const scrollAmount = 250; // pixels to scroll
        const newScrollLeft = direction === 'left' 
            ? container.scrollLeft - scrollAmount 
            : container.scrollLeft + scrollAmount;

        container.scrollTo({
            left: newScrollLeft,
            behavior: 'smooth'
        });

        console.log(`📜 Scrolling ${direction}: ${newScrollLeft}px`);
    },

    /**
     * Render current card
     */
    renderCurrentCard() {
        const deck = this.decks.find(d => d.id === this.currentDeckId);
        if (!deck) return;

        const card = deck.cards[this.currentCardIndex];
        if (!card) return;

        // Update card content (use term/def instead of q/a)
        const questionEl = document.getElementById('cardQuestion');
        const answerEl = document.getElementById('cardAnswer');
        
        if (questionEl) questionEl.textContent = card.term || card.q || '';
        if (answerEl) answerEl.textContent = card.def || card.a || '';

        // Update progress
        const progressEl = document.getElementById('cardProgress');
        if (progressEl) {
            progressEl.textContent = `${this.currentCardIndex + 1} / ${deck.cards.length}`;
        }

        // Reset flip state
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer) {
            cardContainer.classList.remove('flipped');
        }

        // Update button states
        this.updateNavigationButtons();

        console.log(`📄 Rendered card ${this.currentCardIndex + 1}/${deck.cards.length}`);
    },

    /**
     * Flip the current card
     */
    flipCard() {
        const cardContainer = document.querySelector('.card-container');
        if (cardContainer) {
            cardContainer.classList.toggle('flipped');
            console.log('🔄 Card flipped');
        }
    },

    /**
     * Navigate to next card
     */
    nextCard() {
        const deck = this.decks.find(d => d.id === this.currentDeckId);
        if (!deck) return;

        if (this.currentCardIndex < deck.cards.length - 1) {
            this.currentCardIndex++;
            this.renderCurrentCard();
            console.log('➡️ Next card');
        } else {
            console.log('⚠️ Already at last card');
        }
    },

    /**
     * Navigate to previous card
     */
    prevCard() {
        if (this.currentCardIndex > 0) {
            this.currentCardIndex--;
            this.renderCurrentCard();
            console.log('⬅️ Previous card');
        } else {
            console.log('⚠️ Already at first card');
        }
    },

    /**
     * Update navigation button states
     */
    updateNavigationButtons() {
        const deck = this.decks.find(d => d.id === this.currentDeckId);
        if (!deck) return;

        const prevBtn = document.getElementById('btnPrevCard');
        const nextBtn = document.getElementById('btnNextCard');

        if (prevBtn) {
            prevBtn.disabled = this.currentCardIndex === 0;
        }

        if (nextBtn) {
            nextBtn.disabled = this.currentCardIndex === deck.cards.length - 1;
        }
    },

    /**
     * Add a new deck
     */
    addDeck(title, color = 'color-1') {
        const newDeck = {
            id: Date.now(),
            title: title,
            color: color,
            cards: []
        };

        this.decks.push(newDeck);
        this.saveDecks();
        this.renderDecks();

        console.log('✅ New deck added:', newDeck);
        return newDeck.id;
    },

    /**
     * Add a card to a deck
     */
    addCard(deckId, question, answer) {
        const deck = this.decks.find(d => d.id === deckId);
        if (!deck) {
            console.error('❌ Deck not found:', deckId);
            return;
        }

        deck.cards.push({ q: question, a: answer });
        this.saveDecks();
        this.renderDecks();

        console.log('✅ Card added to deck:', deckId);
    },

    /**
     * Delete a deck
     */
    deleteDeck(deckId) {
        const index = this.decks.findIndex(d => d.id === deckId);
        if (index !== -1) {
            this.decks.splice(index, 1);
            this.saveDecks();
            this.renderDecks();
            console.log('🗑️ Deck deleted:', deckId);
        }
    },

    /**
     * Open Create Deck Modal
     */
    openCreateModal() {
        console.log('➕ Opening Create Deck Modal...');
        
        const modal = document.getElementById('createDeckModal');
        if (!modal) {
            console.error('❌ Create modal not found!');
            return;
        }

        // Clear inputs
        const titleInput = document.getElementById('deckTitle');
        const iconInput = document.getElementById('deckIcon');
        const colorSelect = document.getElementById('deckColor');
        
        if (titleInput) titleInput.value = '';
        if (iconInput) iconInput.value = '📚';
        if (colorSelect) colorSelect.value = 'blue';

        // Clear card list and add 3 default rows
        const cardList = document.getElementById('card-input-list');
        if (cardList) {
            cardList.innerHTML = '';
            for (let i = 0; i < 3; i++) {
                this.addCardRow();
            }
        }

        // Show modal
        modal.classList.add('active');
        console.log('✅ Create modal opened with 3 empty card rows');
    },

    /**
     * Close Create Deck Modal
     */
    closeCreateModal() {
        console.log('❌ Closing Create Deck Modal...');
        
        const modal = document.getElementById('createDeckModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    /**
     * Add a new card input row
     */
    addCardRow() {
        console.log('➕ Adding new card row...');
        
        const cardList = document.getElementById('card-input-list');
        if (!cardList) {
            console.error('❌ Card input list not found!');
            return;
        }

        const rowId = 'card-row-' + Date.now();
        const row = document.createElement('div');
        row.className = 'card-input-row';
        row.id = rowId;
        
        row.innerHTML = `
            <input type="text" class="input-term" placeholder="Thuật ngữ (Term)" />
            <input type="text" class="input-definition" placeholder="Định nghĩa (Definition)" />
            <button type="button" class="btn-delete-row" onclick="FlashcardManager.deleteCardRow('${rowId}')" title="Xóa">
                🗑️
            </button>
        `;

        cardList.appendChild(row);
        console.log('✅ Card row added:', rowId);
    },

    /**
     * Delete a card input row
     */
    deleteCardRow(rowId) {
        console.log('🗑️ Deleting card row:', rowId);
        
        const row = document.getElementById(rowId);
        if (row) {
            row.remove();
            console.log('✅ Card row deleted');
        }
    },

    /**
     * Save new deck to localStorage
     */
    saveDeck() {
        console.log('💾 Saving new deck...');
        
        // Get title
        const titleInput = document.getElementById('deckTitle');
        const iconInput = document.getElementById('deckIcon');
        const colorSelect = document.getElementById('deckColor');
        
        const title = titleInput ? titleInput.value.trim() : '';
        const icon = iconInput ? iconInput.value.trim() : '📚';
        const color = colorSelect ? colorSelect.value : 'blue';

        // Validation: Title required
        if (!title) {
            console.warn('⚠️ Validation failed: Title is required');
            Swal.fire({
                icon: 'error',
                title: 'Thiếu tiêu đề',
                text: 'Vui lòng nhập tiêu đề cho bộ thẻ!'
            });
            return;
        }

        // Get all card rows
        const rows = document.querySelectorAll('.card-input-row');
        const cards = [];

        rows.forEach(row => {
            const termInput = row.querySelector('.input-term');
            const defInput = row.querySelector('.input-definition');
            
            const term = termInput ? termInput.value.trim() : '';
            const def = defInput ? defInput.value.trim() : '';

            // Only add if both fields are filled
            if (term && def) {
                cards.push({ term, def });
            }
        });

        // Validation: At least 1 card required
        if (cards.length === 0) {
            console.warn('⚠️ Validation failed: At least 1 card required');
            Swal.fire({
                icon: 'error',
                title: 'Chưa có thẻ nào',
                text: 'Vui lòng thêm ít nhất 1 thẻ (cả Term và Definition)!'
            });
            return;
        }

        console.log('📋 Deck data:', { title, icon, color, cardCount: cards.length });

        // Create new deck
        const newDeck = {
            id: Date.now(),
            title: title,
            icon: icon,
            color: color,
            cards: cards
        };

        // Add to decks array
        this.decks.push(newDeck);
        
        // Save to localStorage
        this.saveDecks();
        
        // Re-render decks
        this.renderDecks();
        
        // Close modal
        this.closeCreateModal();

        // Success message
        Swal.fire({
            icon: 'success',
            title: 'Tạo bộ thẻ thành công!',
            text: `"${title}" với ${cards.length} thẻ đã được lưu.`,
            timer: 2000,
            showConfirmButton: false
        });

        console.log('✅ Deck saved successfully:', newDeck);
    }
};
