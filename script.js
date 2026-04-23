const GRID_SIZE = 70;
const BOARD_CELLS = 6;

const PIECE_TYPES = {
    A: { length: 2, color: '#e53935' },
    B: { length: 2, color: '#f4dd21' },
    C: { length: 3, color: '#f4dd21' },
    D: { length: 2, color: '#f28c28' },
    E: { length: 3, color: '#f28c28' },
    F: { length: 2, color: '#2e7d32' },
    G: { length: 3, color: '#2e7d32' },
    H: { length: 2, color: '#8e44ad' },
    I: { length: 3, color: '#8e44ad' },
    J: { length: 2, color: '#1976d2' },
    K: { length: 3, color: '#1976d2' },
    L: { length: 2, color: '#9e9e9e' },
    M: { length: 3, color: '#9e9e9e' },
    N: { length: 2, color: '#7ec8e3' },
    O: { length: 2, color: '#102a72' },
    P: { length: 2, color: '#4a4a4a' },
    Q: { length: 2, color: '#00a6a6' },
    R: { length: 2, color: '#1b5e20' }
};

const board = document.getElementById('game-board');
const palette = document.getElementById('palette');
const positions = document.getElementById('positions');
const moveCounter = document.getElementById('move-counter');
const goalRowSelect = document.getElementById('goal-row');
const rotateBtn = document.getElementById('rotate-piece');
const removeBtn = document.getElementById('remove-piece');
const resetBtn = document.getElementById('reset-board');
const modal = document.getElementById('modal');
const modalMessage = document.getElementById('modal-message');

let moveCount = 0;
let selectedPiece = null;
let goalRow = 2;
const placedPieces = new Map();

function init() {
    buildGoalSelector();
    buildPalette();
    bindPanelEvents();
    renderBoard();
    updateMoveCounter();
}

function buildGoalSelector() {
    for (let row = 0; row < BOARD_CELLS; row++) {
        const option = document.createElement('option');
        option.value = String(row);
        option.textContent = `Fila ${row + 1}`;
        goalRowSelect.appendChild(option);
    }
    goalRowSelect.value = String(goalRow);
}

function buildPalette() {
    Object.entries(PIECE_TYPES).forEach(([name, data]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'palette-btn';
        btn.dataset.piece = name;
        btn.textContent = `${name} (${data.length})`;
        btn.style.backgroundColor = data.color;
        btn.addEventListener('click', () => addPiece(name));
        palette.appendChild(btn);
    });
}

function bindPanelEvents() {
    goalRowSelect.addEventListener('change', () => {
        goalRow = Number(goalRowSelect.value);
        board.style.setProperty('--goal-row', String(goalRow));
        checkWin();
    });

    rotateBtn.addEventListener('click', () => {
        if (!selectedPiece) return;
        const next = selectedPiece.orientation === 'horizontal' ? 'vertical' : 'horizontal';
        if (canPlacePiece(selectedPiece.name, selectedPiece.x, selectedPiece.y, next, selectedPiece.name)) {
            selectedPiece.orientation = next;
            renderBoard();
            checkWin();
        }
    });

    removeBtn.addEventListener('click', () => {
        if (!selectedPiece) return;
        placedPieces.delete(selectedPiece.name);
        selectedPiece = null;
        renderBoard();
        updatePaletteState();
        checkWin();
    });

    resetBtn.addEventListener('click', () => {
        placedPieces.clear();
        selectedPiece = null;
        moveCount = 0;
        updateMoveCounter();
        renderBoard();
        updatePaletteState();
    });

    document.getElementById('retry-button').addEventListener('click', () => {
        modal.style.display = 'none';
    });
}

function addPiece(name) {
    if (placedPieces.has(name)) return;
    const orientation = name === 'A' ? 'horizontal' : 'horizontal';
    const slot = findFirstSlot(name, orientation);
    if (!slot) {
        alert('No hay espacio libre para agregar esa ficha.');
        return;
    }

    placedPieces.set(name, {
        name,
        x: slot.x,
        y: slot.y,
        orientation
    });

    selectedPiece = placedPieces.get(name);
    renderBoard();
    updatePaletteState();
    checkWin();
}

function findFirstSlot(name, orientation) {
    for (let y = 0; y < BOARD_CELLS; y++) {
        for (let x = 0; x < BOARD_CELLS; x++) {
            if (canPlacePiece(name, x, y, orientation)) return { x, y };
        }
    }
    return null;
}

function renderBoard() {
    board.innerHTML = '';
    board.style.setProperty('--goal-row', String(goalRow));

    Array.from(placedPieces.values()).forEach(piece => {
        const def = PIECE_TYPES[piece.name];
        const el = document.createElement('div');
        el.className = `draggable ${piece.orientation}`;
        if (selectedPiece?.name === piece.name) {
            el.classList.add('selected');
        }

        el.id = piece.name === 'A' ? 'piece-3' : `piece-${piece.name}`;
        el.textContent = piece.name;
        el.style.backgroundColor = def.color;
        el.style.left = `${piece.x * GRID_SIZE}px`;
        el.style.top = `${piece.y * GRID_SIZE}px`;
        el.style.width = `${(piece.orientation === 'horizontal' ? def.length : 1) * GRID_SIZE}px`;
        el.style.height = `${(piece.orientation === 'vertical' ? def.length : 1) * GRID_SIZE}px`;

        el.addEventListener('mousedown', startDrag);
        el.addEventListener('touchstart', startDrag, { passive: false });
        el.addEventListener('click', () => {
            selectedPiece = piece;
            renderBoard();
        });

        board.appendChild(el);
    });

    updatePiecePositions();
}

function startDrag(event) {
    event.preventDefault();

    const target = event.currentTarget;
    const name = target.textContent;
    const piece = placedPieces.get(name);
    if (!piece) return;

    selectedPiece = piece;
    renderBoard();

    const isTouch = event.type === 'touchstart';
    const point = isTouch ? event.touches[0] : event;

    const startX = point.clientX;
    const startY = point.clientY;
    const initialX = piece.x;
    const initialY = piece.y;

    const onMove = evt => {
        const movePoint = isTouch ? evt.touches[0] : evt;
        const dx = movePoint.clientX - startX;
        const dy = movePoint.clientY - startY;

        let nextX = initialX;
        let nextY = initialY;

        if (piece.orientation === 'horizontal') {
            nextX = clamp(initialX + Math.round(dx / GRID_SIZE), 0, BOARD_CELLS - PIECE_TYPES[name].length);
        } else {
            nextY = clamp(initialY + Math.round(dy / GRID_SIZE), 0, BOARD_CELLS - PIECE_TYPES[name].length);
        }

        if (canPlacePiece(name, nextX, nextY, piece.orientation, name)) {
            piece.x = nextX;
            piece.y = nextY;
            target.style.left = `${piece.x * GRID_SIZE}px`;
            target.style.top = `${piece.y * GRID_SIZE}px`;
        }
    };

    const onEnd = () => {
        document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onMove);
        document.removeEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);

        if (piece.x !== initialX || piece.y !== initialY) {
            moveCount += 1;
            updateMoveCounter();
        }

        renderBoard();
        checkWin();
    };

    document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onMove, { passive: false });
    document.addEventListener(isTouch ? 'touchend' : 'mouseup', onEnd);
}

function canPlacePiece(name, x, y, orientation, ignoreName = null) {
    const length = PIECE_TYPES[name].length;

    if (x < 0 || y < 0 || x >= BOARD_CELLS || y >= BOARD_CELLS) return false;
    if (orientation === 'horizontal' && x + length > BOARD_CELLS) return false;
    if (orientation === 'vertical' && y + length > BOARD_CELLS) return false;

    const footprint = [];
    for (let i = 0; i < length; i++) {
        footprint.push({
            x: orientation === 'horizontal' ? x + i : x,
            y: orientation === 'vertical' ? y + i : y
        });
    }

    for (const other of placedPieces.values()) {
        if (other.name === ignoreName) continue;

        const otherLength = PIECE_TYPES[other.name].length;
        for (let i = 0; i < otherLength; i++) {
            const ox = other.orientation === 'horizontal' ? other.x + i : other.x;
            const oy = other.orientation === 'vertical' ? other.y + i : other.y;

            if (footprint.some(cell => cell.x === ox && cell.y === oy)) {
                return false;
            }
        }
    }

    return true;
}

function updatePaletteState() {
    document.querySelectorAll('.palette-btn').forEach(btn => {
        btn.disabled = placedPieces.has(btn.dataset.piece);
    });
}

function updatePiecePositions() {
    positions.innerHTML = '';
    const ordered = [...placedPieces.values()].sort((a, b) => a.name.localeCompare(b.name));

    ordered.forEach(piece => {
        const row = piece.y + 1;
        const col = piece.x + 1;
        const line = document.createElement('div');
        line.textContent = `Ficha ${piece.name}: fila ${row}, columna ${col}, ${piece.orientation}`;
        positions.appendChild(line);
    });

    if (!ordered.length) {
        positions.textContent = 'No hay fichas en el tablero.';
    }
}

function updateMoveCounter() {
    moveCounter.textContent = `Movimientos: ${moveCount}`;
}

function checkWin() {
    const pieceA = placedPieces.get('A');
    if (!pieceA) return;

    const reachedExit = pieceA.orientation === 'horizontal'
        && pieceA.y === goalRow
        && (pieceA.x + PIECE_TYPES.A.length - 1 === BOARD_CELLS - 1);

    if (reachedExit) {
        modalMessage.textContent = `¡Ganaste! La ficha A llegó a la meta en ${moveCount} movimientos.`;
        modal.style.display = 'block';
    }
}

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

init();
