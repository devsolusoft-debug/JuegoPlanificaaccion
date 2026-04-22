// Constants
        const GRID_SIZE = 70;
        const BOARD_ROWS = 6;
        const BOARD_COLS = 6;

        // Piece definitions
        const PIECES = [
            { name: 'A', width: 2, height: 1, color: '#e73137' },
            { name: 'B', width: 2, height: 1, color: '#ffee00' },
            { name: 'C', width: 3, height: 1, color: '#ffee00' },
            { name: 'D', width: 2, height: 1, color: '#ed7402' },
            { name: 'E', width: 3, height: 1, color: '#ed7402' },
            { name: 'F', width: 2, height: 1, color: '#93c01f' },
            { name: 'G', width: 3, height: 1, color: '#93c01f' },
            { name: 'H', width: 2, height: 1, color: '#67569f' },
            { name: 'I', width: 3, height: 1, color: '#67569f' },
            { name: 'J', width: 2, height: 1, color: '#0071bb' },
            { name: 'K', width: 3, height: 1, color: '#0071bb' },
            { name: 'L', width: 2, height: 1, color: '#9c9a8c' },
            { name: 'M', width: 3, height: 1, color: '#9c9a8c' },
            { name: 'N', width: 2, height: 1, color: '#50c0df' },
            { name: 'O', width: 2, height: 1, color: '#163072' },
            { name: 'P', width: 2, height: 1, color: '#5f5f5e' },
            { name: 'Q', width: 2, height: 1, color: '#009998' },
            { name: 'R', width: 2, height: 1, color: '#006a5d' },
        ];

        // State
        let boardPieces = [];
        let selectedPieceId = null;
        let goalPosition = null;
        let isSettingGoal = false;
        let draggedPiece = null;
        let previewPieces = [];
        let previewMoveCount = 0;
        let previewCompleted = false;

        // DOM Elements
        const gameBoard = document.getElementById('gameBoard');
        const palette = document.getElementById('palette');
        const goalBtn = document.getElementById('goalBtn');
        const goalInfo = document.getElementById('goalInfo');
        const previewBtn = document.getElementById('previewBtn');
        const clearBtn = document.getElementById('clearBtn');
        const rotateBtn = document.getElementById('rotateBtn');
        const deleteBtn = document.getElementById('deleteBtn');
        const previewModal = document.getElementById('previewModal');

        // Initialize
        document.addEventListener('DOMContentLoaded', () => {
            initializePalette();
            setupEventListeners();
            updateUI();
        });

        function initializePalette() {
            palette.innerHTML = '';
            PIECES.forEach(piece => {
                const item = document.createElement('div');
                item.className = 'palette-item';
                item.draggable = true;
                item.innerHTML = `
                    <div class="piece-preview" style="background-color: ${piece.color}; width: ${piece.width * 30}px; height: ${piece.height * 20}px;">
                        ${piece.name}
                    </div>
                    <div class="piece-label">
                        <strong>Ficha ${piece.name}</strong>
                        <small>${piece.width}×${piece.height}</small>
                    </div>
                    <button class="add-btn" onclick="addPieceFromPalette('${piece.name}', ${piece.width}, ${piece.height}, '${piece.color}')">+</button>
                `;
                item.addEventListener('dragstart', (e) => {
                    e.dataTransfer.effectAllowed = 'copy';
                    e.dataTransfer.setData('pieceType', JSON.stringify({ 
                        name: piece.name, 
                        width: piece.width, 
                        height: piece.height, 
                        color: piece.color 
                    }));
                });
                palette.appendChild(item);
            });
        }

        function setupEventListeners() {
            goalBtn.addEventListener('click', toggleGoalMode);
            previewBtn.addEventListener('click', openPreviewModal);
            clearBtn.addEventListener('click', clearBoard);
            rotateBtn.addEventListener('click', rotatePiece);
            deleteBtn.addEventListener('click', deletePiece);

            gameBoard.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
            });

            gameBoard.addEventListener('drop', (e) => {
                e.preventDefault();
                if (isSettingGoal) return;

                const data = e.dataTransfer.getData('pieceType');
                if (data) {
                    const piece = JSON.parse(data);
                    const rect = gameBoard.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const col = Math.floor(x / GRID_SIZE);
                    const row = Math.floor(y / GRID_SIZE);

                    if (col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS) {
                        addPiece(piece.name, piece.width, piece.height, piece.color, row, col);
                    }
                }
            });

            gameBoard.addEventListener('click', (e) => {
                if (isSettingGoal && e.target === gameBoard) {
                    const rect = gameBoard.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;

                    const col = Math.floor(x / GRID_SIZE);
                    const row = Math.floor(y / GRID_SIZE);

                    if (col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS) {
                        setGoal(row, col);
                        isSettingGoal = false;
                        goalBtn.classList.remove('active');
                    }
                }
            });
        }

        function addPieceFromPalette(name, width, height, color) {
            // Posicionar en el centro del tablero
            const centerRow = Math.floor((BOARD_ROWS - height) / 2);
            const centerCol = Math.floor((BOARD_COLS - width) / 2);
            addPiece(name, width, height, color, centerRow, centerCol);
        }

        function addPiece(name, width, height, color, row, col) {
            const id = `piece-${Date.now()}-${Math.random()}`;
            const piece = {
                id,
                name,
                width,
                height,
                color,
                row,
                col,
                isRotated: false,
            };
            boardPieces.push(piece);
            renderBoard();
            updateUI();
        }

        function renderBoard() {
            gameBoard.innerHTML = '';

            // Draw goal indicator
            if (goalPosition) {
                const goalDiv = document.createElement('div');
                goalDiv.className = 'goal-indicator';
                goalDiv.style.left = `${goalPosition.col * GRID_SIZE}px`;
                goalDiv.style.top = `${goalPosition.row * GRID_SIZE}px`;
                gameBoard.appendChild(goalDiv);
            }

            // Draw pieces
            boardPieces.forEach(piece => {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = 'piece';
                if (selectedPieceId === piece.id) {
                    pieceDiv.classList.add('selected');
                }
                pieceDiv.style.left = `${piece.col * GRID_SIZE}px`;
                pieceDiv.style.top = `${piece.row * GRID_SIZE}px`;
                pieceDiv.style.width = `${piece.width * GRID_SIZE}px`;
                pieceDiv.style.height = `${piece.height * GRID_SIZE}px`;
                pieceDiv.style.backgroundColor = piece.color;
                pieceDiv.textContent = piece.name;

                pieceDiv.addEventListener('mousedown', (e) => {
                    if (isSettingGoal) return;
                    selectPiece(piece.id);
                    startDrag(e, piece);
                });

                pieceDiv.addEventListener('click', (e) => {
                    e.stopPropagation();
                    selectPiece(piece.id);
                });

                gameBoard.appendChild(pieceDiv);
            });
        }

        function selectPiece(id) {
            selectedPieceId = id;
            renderBoard();
            updateUI();
        }

        function startDrag(e, piece) {
            e.preventDefault();
            draggedPiece = piece;
            
            const boardRect = gameBoard.getBoundingClientRect();
            const pieceWidth = piece.width * GRID_SIZE;
            const pieceHeight = piece.height * GRID_SIZE;
            
            const startX = e.clientX;
            const startY = e.clientY;
            const startCol = piece.col;
            const startRow = piece.row;

            function onMouseMove(moveEvent) {
                const deltaX = moveEvent.clientX - startX;
                const deltaY = moveEvent.clientY - startY;
                
                const pixelX = startCol * GRID_SIZE + deltaX;
                const pixelY = startRow * GRID_SIZE + deltaY;
                
                let col = Math.round(pixelX / GRID_SIZE);
                let row = Math.round(pixelY / GRID_SIZE);
                
                col = Math.max(0, Math.min(BOARD_COLS - piece.width, col));
                row = Math.max(0, Math.min(BOARD_ROWS - piece.height, row));
                
                piece.col = col;
                piece.row = row;
                renderBoard();
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                draggedPiece = null;
                renderBoard();
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function toggleGoalMode() {
            isSettingGoal = !isSettingGoal;
            goalBtn.classList.toggle('active', isSettingGoal);
            gameBoard.style.cursor = isSettingGoal ? 'crosshair' : 'default';
            if (!isSettingGoal) {
                selectedPieceId = null;
                renderBoard();
            }
        }

        function setGoal(row, col) {
            goalPosition = { row, col };
            updateUI();
            renderBoard();
        }

        function rotatePiece() {
            if (!selectedPieceId) return;
            const piece = boardPieces.find(p => p.id === selectedPieceId);
            if (piece) {
                [piece.width, piece.height] = [piece.height, piece.width];
                piece.isRotated = !piece.isRotated;
                renderBoard();
                updateUI();
            }
        }

        function deletePiece() {
            if (!selectedPieceId) return;
            boardPieces = boardPieces.filter(p => p.id !== selectedPieceId);
            selectedPieceId = null;
            renderBoard();
            updateUI();
        }

        function clearBoard() {
            if (confirm('¿Estás seguro de que deseas limpiar el tablero?')) {
                boardPieces = [];
                goalPosition = null;
                selectedPieceId = null;
                isSettingGoal = false;
                goalBtn.classList.remove('active');
                renderBoard();
                updateUI();
            }
        }

        function updateUI() {
            const canPlay = boardPieces.length > 0 && goalPosition;
            previewBtn.disabled = !canPlay;

            const selectedPiece = boardPieces.find(p => p.id === selectedPieceId);
            if (selectedPiece) {
                document.getElementById('selectedPieceCard').style.display = 'block';
            } else {
                document.getElementById('selectedPieceCard').style.display = 'none';
            }

            if (goalPosition) {
                goalInfo.textContent = `Meta: (${goalPosition.row}, ${goalPosition.col})`;
                goalInfo.style.display = 'block';
            } else {
                goalInfo.style.display = 'none';
            }
        }

        function openPreviewModal() {
            previewPieces = JSON.parse(JSON.stringify(boardPieces));
            previewMoveCount = 0;
            previewCompleted = false;
            document.getElementById('winMessage').style.display = 'none';
            previewModal.style.display = 'flex';
            requestAnimationFrame(renderPreviewBoard);
        }

        function closePreviewModal() {
            previewModal.style.display = 'none';
            previewCompleted = false;
            document.getElementById('winMessage').style.display = 'none';
        }

        function renderPreviewBoard() {
            const previewBoard = document.getElementById('previewBoard');
            previewBoard.innerHTML = '';
            const previewGridSize = getPreviewGridSize(previewBoard);
            previewBoard.style.setProperty('--preview-cell-size', `${previewGridSize}px`);

            if (goalPosition) {
                const goalDiv = document.createElement('div');
                goalDiv.className = 'goal-indicator';
                goalDiv.style.width = `${previewGridSize}px`;
                goalDiv.style.height = `${previewGridSize}px`;
                goalDiv.style.left = `${goalPosition.col * previewGridSize}px`;
                goalDiv.style.top = `${goalPosition.row * previewGridSize}px`;
                previewBoard.appendChild(goalDiv);
            }

            previewPieces.forEach(piece => {
                const pieceDiv = document.createElement('div');
                pieceDiv.className = 'piece';
                pieceDiv.style.left = `${piece.col * previewGridSize}px`;
                pieceDiv.style.top = `${piece.row * previewGridSize}px`;
                pieceDiv.style.width = `${piece.width * previewGridSize}px`;
                pieceDiv.style.height = `${piece.height * previewGridSize}px`;
                pieceDiv.style.backgroundColor = piece.color;
                pieceDiv.textContent = piece.name;

                pieceDiv.addEventListener('mousedown', (e) => {
                    startPreviewDrag(e, piece);
                });

                previewBoard.appendChild(pieceDiv);
            });

            document.getElementById('previewMoveCount').textContent = previewMoveCount;
        }

        function startPreviewDrag(e, piece) {
            if (previewCompleted) return;
            e.preventDefault();
            const rect = e.target.getBoundingClientRect();
            const previewBoard = document.getElementById('previewBoard');
            const previewGridSize = getPreviewGridSize(previewBoard);
            const initialCol = piece.col;
            const initialRow = piece.row;
            const isHorizontal = piece.width > piece.height;
            const isVertical = piece.height > piece.width;
            
            const offsetX = e.clientX - rect.left;
            const offsetY = e.clientY - rect.top;

            function onMouseMove(moveEvent) {
                const boardRect = previewBoard.getBoundingClientRect();
                const x = moveEvent.clientX - boardRect.left - offsetX;
                const y = moveEvent.clientY - boardRect.top - offsetY;

                let col = Math.round(x / previewGridSize);
                let row = Math.round(y / previewGridSize);

                col = Math.max(0, Math.min(BOARD_COLS - piece.width, col));
                row = Math.max(0, Math.min(BOARD_ROWS - piece.height, row));

                // Restringir movimiento por orientación
                if (isHorizontal) {
                    row = initialRow;
                } else if (isVertical) {
                    col = initialCol;
                }

                const hasCollision = previewPieces.some(
                    p =>
                        p.id !== piece.id &&
                        !(
                            col + piece.width <= p.col ||
                            col >= p.col + p.width ||
                            row + piece.height <= p.row ||
                            row >= p.row + p.height
                        )
                );

                if (!hasCollision) {
                    piece.col = col;
                    piece.row = row;
                    renderPreviewBoard();
                }
            }

            function onMouseUp() {
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                previewMoveCount++;
                document.getElementById('previewMoveCount').textContent = previewMoveCount;

                const piecA = previewPieces.find(p => p.name === 'A');
                if (!previewCompleted && piecA && didPieceReachGoal(piecA)) {
                    previewCompleted = true;
                    const winMessage = document.getElementById('winMessage');
                    winMessage.textContent = `¡Desafío completado! 🎉 Movimientos: ${previewMoveCount}`;
                    winMessage.style.display = 'block';
                }

                renderPreviewBoard();
            }

            document.addEventListener('mousemove', onMouseMove);
            document.addEventListener('mouseup', onMouseUp);
        }

        function getPreviewGridSize(previewBoard) {
            const size = previewBoard.getBoundingClientRect().width / BOARD_COLS;
            return Number.isFinite(size) && size > 0 ? size : GRID_SIZE;
        }

        function resetPreview() {
            previewPieces = JSON.parse(JSON.stringify(boardPieces));
            previewMoveCount = 0;
            previewCompleted = false;
            document.getElementById('winMessage').style.display = 'none';
            renderPreviewBoard();
        }

        function didPieceReachGoal(piece) {
            if (!goalPosition) return false;
            return !(
                piece.col + piece.width <= goalPosition.col ||
                piece.col >= goalPosition.col + 1 ||
                piece.row + piece.height <= goalPosition.row ||
                piece.row >= goalPosition.row + 1
            );
        }
