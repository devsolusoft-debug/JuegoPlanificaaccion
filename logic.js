const GRID_SIZE = 70;
const BOARD_ROWS = 6;
const BOARD_COLS = 6;

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

let boardPieces = [];
let selectedPieceId = null;
let goalPosition = null;
let isSettingGoal = false;

let isPlaying = false;
let gamePieces = [];
let gameMoveCount = 0;
let gameCompleted = false;

const appContainer = document.getElementById('appContainer');
const gameBoard = document.getElementById('gameBoard');
const palette = document.getElementById('palette');
const goalBtn = document.getElementById('goalBtn');
const goalInfo = document.getElementById('goalInfo');
const previewBtn = document.getElementById('previewBtn');
const clearBtn = document.getElementById('clearBtn');
const rotateBtn = document.getElementById('rotateBtn');
const deleteBtn = document.getElementById('deleteBtn');
const playControls = document.getElementById('playControls');
const liveMoveCount = document.getElementById('liveMoveCount');
const liveWinMessage = document.getElementById('liveWinMessage');
const restartBtn = document.getElementById('restartBtn');
const closeGameBtn = document.getElementById('closeGameBtn');

document.addEventListener('DOMContentLoaded', () => {
    initializePalette();
    setupEventListeners();
    updateUI();
    renderBoard();
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
        item.addEventListener('dragstart', e => {
            e.dataTransfer.effectAllowed = 'copy';
            e.dataTransfer.setData('pieceType', JSON.stringify(piece));
        });
        palette.appendChild(item);
    });
}

function setupEventListeners() {
    goalBtn.addEventListener('click', toggleGoalMode);
    previewBtn.addEventListener('click', startGameMode);
    clearBtn.addEventListener('click', clearBoard);
    rotateBtn.addEventListener('click', rotatePiece);
    deleteBtn.addEventListener('click', deletePiece);
    restartBtn.addEventListener('click', restartGameMode);
    closeGameBtn.addEventListener('click', closeGameMode);

    gameBoard.addEventListener('dragover', e => {
        e.preventDefault();
        if (!isPlaying) e.dataTransfer.dropEffect = 'copy';
    });

    gameBoard.addEventListener('drop', e => {
        e.preventDefault();
        if (isSettingGoal || isPlaying) return;

        const data = e.dataTransfer.getData('pieceType');
        if (!data) return;

        const piece = JSON.parse(data);
        const rect = gameBoard.getBoundingClientRect();
        const col = Math.floor((e.clientX - rect.left) / GRID_SIZE);
        const row = Math.floor((e.clientY - rect.top) / GRID_SIZE);

        if (isWithinBoard(row, col) && canPlaceAt(boardPieces, row, col, piece.width, piece.height, null, false)) {
            addPiece(piece.name, piece.width, piece.height, piece.color, row, col);
        }
    });

    gameBoard.addEventListener('click', e => {
        if (!isSettingGoal || isPlaying || e.target !== gameBoard) return;

        const rect = gameBoard.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const col = Math.floor(x / GRID_SIZE);
        const row = Math.floor(y / GRID_SIZE);

        if (isWithinBoard(row, col)) {
            const allowedSides = getAllowedGoalSides(row, col);
            if (!allowedSides.length) {
                alert('La meta solo se puede ubicar en casillas de la orilla.');
                return;
            }

            const side = getClosestAllowedSide(row, col, x, y, allowedSides);

            setGoal(row, col, side);
            isSettingGoal = false;
            goalBtn.classList.remove('active');
        }
    });
}

function addPieceFromPalette(name, width, height, color) {
    if (isPlaying) return;
    const centerRow = Math.floor((BOARD_ROWS - height) / 2);
    const centerCol = Math.floor((BOARD_COLS - width) / 2);

    if (!canPlaceAt(boardPieces, centerRow, centerCol, width, height, null, false)) {
        return;
    }

    addPiece(name, width, height, color, centerRow, centerCol);
}

function addPiece(name, width, height, color, row, col) {
    if (isPlaying) return;

    const piece = {
        id: `piece-${Date.now()}-${Math.random()}`,
        name,
        width,
        height,
        color,
        row,
        col,
    };

    boardPieces.push(piece);
    renderBoard();
    updateUI();
}

function renderBoard() {
    gameBoard.innerHTML = '';

    if (goalPosition) {
        const goalDiv = document.createElement('div');
        goalDiv.className = 'goal-indicator';
        const { row, col, side } = goalPosition;

        if (side === 'left') {
            goalDiv.style.left = `${col * GRID_SIZE}px`;
            goalDiv.style.top = `${row * GRID_SIZE}px`;
            goalDiv.style.width = '10px';
            goalDiv.style.height = `${GRID_SIZE}px`;
        } else if (side === 'right') {
            goalDiv.style.left = `${col * GRID_SIZE + GRID_SIZE - 10}px`;
            goalDiv.style.top = `${row * GRID_SIZE}px`;
            goalDiv.style.width = '10px';
            goalDiv.style.height = `${GRID_SIZE}px`;
        } else if (side === 'top') {
            goalDiv.style.left = `${col * GRID_SIZE}px`;
            goalDiv.style.top = `${row * GRID_SIZE}px`;
            goalDiv.style.width = `${GRID_SIZE}px`;
            goalDiv.style.height = '10px';
        } else if (side === 'bottom') {
            goalDiv.style.left = `${col * GRID_SIZE}px`;
            goalDiv.style.top = `${row * GRID_SIZE + GRID_SIZE - 10}px`;
            goalDiv.style.width = `${GRID_SIZE}px`;
            goalDiv.style.height = '10px';
        }
        gameBoard.appendChild(goalDiv);
    }

    const activePieces = isPlaying ? gamePieces : boardPieces;
    activePieces.forEach(piece => {
        const pieceDiv = document.createElement('div');
        pieceDiv.className = 'piece';

        if (!isPlaying && selectedPieceId === piece.id) {
            pieceDiv.classList.add('selected');
        }

        pieceDiv.style.left = `${piece.col * GRID_SIZE}px`;
        pieceDiv.style.top = `${piece.row * GRID_SIZE}px`;
        pieceDiv.style.width = `${piece.width * GRID_SIZE}px`;
        pieceDiv.style.height = `${piece.height * GRID_SIZE}px`;
        pieceDiv.style.backgroundColor = piece.color;
        pieceDiv.textContent = piece.name;

        pieceDiv.addEventListener('mousedown', e => {
            if (isSettingGoal) return;
            if (isPlaying) {
                startGameDrag(e, piece);
                return;
            }
            selectPiece(piece.id);
            startEditorDrag(e, piece);
        });

        pieceDiv.addEventListener('click', e => {
            e.stopPropagation();
            if (!isPlaying) selectPiece(piece.id);
        });

        gameBoard.appendChild(pieceDiv);
    });
}

function selectPiece(id) {
    selectedPieceId = id;
    renderBoard();
    updateUI();
}

function startEditorDrag(e, piece) {
    if (isPlaying) return;
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startCol = piece.col;
    const startRow = piece.row;

    function onMouseMove(moveEvent) {
        const deltaX = moveEvent.clientX - startX;
        const deltaY = moveEvent.clientY - startY;

        let col = Math.round((startCol * GRID_SIZE + deltaX) / GRID_SIZE);
        let row = Math.round((startRow * GRID_SIZE + deltaY) / GRID_SIZE);

        col = Math.max(0, Math.min(BOARD_COLS - piece.width, col));
        row = Math.max(0, Math.min(BOARD_ROWS - piece.height, row));

        if (canPlaceAt(boardPieces, row, col, piece.width, piece.height, piece.id, false)) {
            piece.col = col;
            piece.row = row;
            renderBoard();
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function startGameDrag(e, piece) {
    if (gameCompleted) return;
    e.preventDefault();

    const rect = e.target.getBoundingClientRect();
    const initialCol = piece.col;
    const initialRow = piece.row;
    const isHorizontal = piece.width > piece.height;
    const isVertical = piece.height > piece.width;

    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    function onMouseMove(moveEvent) {
        const boardRect = gameBoard.getBoundingClientRect();
        const x = moveEvent.clientX - boardRect.left - offsetX;
        const y = moveEvent.clientY - boardRect.top - offsetY;

        let col = Math.round(x / GRID_SIZE);
        let row = Math.round(y / GRID_SIZE);

        col = Math.max(0, Math.min(BOARD_COLS - piece.width, col));
        row = Math.max(0, Math.min(BOARD_ROWS - piece.height, row));

        if (isHorizontal) row = initialRow;
        if (isVertical) col = initialCol;

        if (canPlaceAt(gamePieces, row, col, piece.width, piece.height, piece.id)) {
            piece.col = col;
            piece.row = row;
            renderBoard();
        }
    }

    function onMouseUp() {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);

        if (piece.col !== initialCol || piece.row !== initialRow) {
            gameMoveCount += 1;
            liveMoveCount.textContent = String(gameMoveCount);
        }

        const pieceA = gamePieces.find(p => p.name === 'A');
        if (!gameCompleted && pieceA && didPieceReachGoal(pieceA)) {
            gameCompleted = true;
            liveWinMessage.textContent = `¡Desafío completado! 🎉 Movimientos: ${gameMoveCount}`;
            liveWinMessage.style.display = 'block';
        }

        renderBoard();
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

function toggleGoalMode() {
    if (isPlaying) return;
    isSettingGoal = !isSettingGoal;
    goalBtn.classList.toggle('active', isSettingGoal);
    gameBoard.style.cursor = isSettingGoal ? 'crosshair' : 'default';
    if (!isSettingGoal) {
        selectedPieceId = null;
        renderBoard();
    }
}

function setGoal(row, col, side) {
    goalPosition = { row, col, side };
    updateUI();
    renderBoard();
}

function rotatePiece() {
    if (!selectedPieceId || isPlaying) return;
    const piece = boardPieces.find(p => p.id === selectedPieceId);
    if (!piece) return;

    const rotatedWidth = piece.height;
    const rotatedHeight = piece.width;

    if (!canPlaceAt(boardPieces, piece.row, piece.col, rotatedWidth, rotatedHeight, piece.id, false)) return;

    piece.width = rotatedWidth;
    piece.height = rotatedHeight;
    renderBoard();
    updateUI();
}

function deletePiece() {
    if (!selectedPieceId || isPlaying) return;
    boardPieces = boardPieces.filter(p => p.id !== selectedPieceId);
    selectedPieceId = null;
    renderBoard();
    updateUI();
}

function clearBoard() {
    if (isPlaying) return;
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

function startGameMode() {
    if (isPlaying) return;
    if (!boardPieces.length || !goalPosition) return;

    isPlaying = true;
    isSettingGoal = false;
    selectedPieceId = null;
    gamePieces = JSON.parse(JSON.stringify(boardPieces));
    gameMoveCount = 0;
    gameCompleted = false;

    liveMoveCount.textContent = '0';
    liveWinMessage.style.display = 'none';
    playControls.style.display = 'block';
    appContainer.classList.add('is-playing');

    goalBtn.classList.remove('active');
    gameBoard.style.cursor = 'default';

    updateUI();
    renderBoard();
}

function restartGameMode() {
    if (!isPlaying) return;
    gamePieces = JSON.parse(JSON.stringify(boardPieces));
    gameMoveCount = 0;
    gameCompleted = false;
    liveMoveCount.textContent = '0';
    liveWinMessage.style.display = 'none';
    renderBoard();
}

function closeGameMode() {
    if (!isPlaying) return;
    isPlaying = false;
    gameCompleted = false;
    gamePieces = [];
    playControls.style.display = 'none';
    liveWinMessage.style.display = 'none';
    appContainer.classList.remove('is-playing');
    updateUI();
    renderBoard();
}

function updateUI() {
    const canPlay = boardPieces.length > 0 && !!goalPosition;
    previewBtn.disabled = !canPlay || isPlaying;

    const selectedPiece = boardPieces.find(p => p.id === selectedPieceId);
    document.getElementById('selectedPieceCard').style.display = selectedPiece && !isPlaying ? 'block' : 'none';

    if (goalPosition) {
        goalInfo.textContent = `Meta: (${goalPosition.row}, ${goalPosition.col}) lado ${translateSide(goalPosition.side)}`;
        goalInfo.style.display = 'block';
    } else {
        goalInfo.style.display = 'none';
    }
}

function didPieceReachGoal(piece) {
    if (!goalPosition) return false;
    const overlapsGoalCell = !(
        piece.col + piece.width <= goalPosition.col ||
        piece.col >= goalPosition.col + 1 ||
        piece.row + piece.height <= goalPosition.row ||
        piece.row >= goalPosition.row + 1
    );

    if (!overlapsGoalCell) return false;

    if (goalPosition.side === 'left') {
        return piece.col === goalPosition.col;
    }
    if (goalPosition.side === 'right') {
        return piece.col + piece.width === goalPosition.col + 1;
    }
    if (goalPosition.side === 'top') {
        return piece.row === goalPosition.row;
    }
    if (goalPosition.side === 'bottom') {
        return piece.row + piece.height === goalPosition.row + 1;
    }

    return false;
}

function canPlaceAt(pieces, row, col, width, height, ignoreId = null, checkCollision = true) {
    if (col < 0 || row < 0 || col + width > BOARD_COLS || row + height > BOARD_ROWS) return false;

    if (!checkCollision) return true;

    return !pieces.some(p => p.id !== ignoreId && !(
        col + width <= p.col ||
        col >= p.col + p.width ||
        row + height <= p.row ||
        row >= p.row + p.height
    ));
}

function isWithinBoard(row, col) {
    return col >= 0 && col < BOARD_COLS && row >= 0 && row < BOARD_ROWS;
}

function getAllowedGoalSides(row, col) {
    const sides = [];
    if (row === 0) sides.push('top');
    if (row === BOARD_ROWS - 1) sides.push('bottom');
    if (col === 0) sides.push('left');
    if (col === BOARD_COLS - 1) sides.push('right');
    return sides;
}

function getClosestAllowedSide(row, col, x, y, allowedSides) {
    if (allowedSides.length === 1) return allowedSides[0];

    const localX = x - col * GRID_SIZE;
    const localY = y - row * GRID_SIZE;
    const distances = {
        left: localX,
        right: GRID_SIZE - localX,
        top: localY,
        bottom: GRID_SIZE - localY,
    };

    let closestSide = allowedSides[0];
    let minDistance = distances[closestSide];

    allowedSides.forEach(side => {
        if (distances[side] < minDistance) {
            minDistance = distances[side];
            closestSide = side;
        }
    });

    return closestSide;
}

function translateSide(side) {
    if (side === 'left') return 'izquierda';
    if (side === 'right') return 'derecha';
    if (side === 'top') return 'arriba';
    if (side === 'bottom') return 'abajo';
    return side;
}
