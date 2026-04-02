const gridSize = 70;
const pieces = document.querySelectorAll('.draggable');
let moveCount = 0;
let stopDragCount = 0;

pieces.forEach(piece => {
    piece.addEventListener('mousedown', startDrag);
    piece.addEventListener('touchstart', startDrag); // Soporte para dispositivos móviles

    function startDrag(e) {
        e.preventDefault();

        const isTouch = e.type === 'touchstart';
        const startX = isTouch ? e.touches[0].clientX : e.clientX;
        const startY = isTouch ? e.touches[0].clientY : e.clientY;
        const element = e.target;

        element.dataset.lastValidLeft = element.style.left;
        element.dataset.lastValidTop = element.style.top;

        let shiftX = startX - element.getBoundingClientRect().left;
        let shiftY = startY - element.getBoundingClientRect().top;

        const onDrag = (e) => {
            const gameBoardRect = document.getElementById('game-board').getBoundingClientRect();
            const pieceRect = element.getBoundingClientRect();

            let currentX = isTouch ? e.touches[0].clientX : e.clientX;
            let currentY = isTouch ? e.touches[0].clientY : e.clientY;

            let newLeft, newTop;

            if (element.classList.contains('horizontal')) {
                newLeft = Math.min(
                    Math.max(currentX - shiftX, gameBoardRect.left),
                    gameBoardRect.right - pieceRect.width
                );
                newLeft = Math.round((newLeft - gameBoardRect.left) / gridSize) * gridSize;
                element.style.left = newLeft + 'px';
            } else if (element.classList.contains('vertical')) {
                newTop = Math.min(
                    Math.max(currentY - shiftY, gameBoardRect.top),
                    gameBoardRect.bottom - pieceRect.height
                );
                newTop = Math.round((newTop - gameBoardRect.top) / gridSize) * gridSize;
                element.style.top = newTop + 'px';
            }

            if (detectCollisions(element)) {
                element.style.left = element.dataset.lastValidLeft;
                element.style.top = element.dataset.lastValidTop;
                stopDrag();
            } else {
                element.dataset.lastValidLeft = element.style.left;
                element.dataset.lastValidTop = element.style.top;
            }
        };

        const stopDrag = () => {
            document.removeEventListener(isTouch ? 'touchmove' : 'mousemove', onDrag);
            document.removeEventListener(isTouch ? 'touchend' : 'mouseup', stopDrag);

            stopDragCount++;

            if (element.style.left !== element.dataset.lastValidLeft || element.style.top !== element.dataset.lastValidTop) {
                moveCount++;
            }

            updateMoveCounter();
            updatePiecePositions();
        };

        document.addEventListener(isTouch ? 'touchmove' : 'mousemove', onDrag);
        document.addEventListener(isTouch ? 'touchend' : 'mouseup', stopDrag);
    }

    function detectCollisions(currentPiece) {
        let collisionDetected = false;
        const currentRect = currentPiece.getBoundingClientRect();

        pieces.forEach(otherPiece => {
            if (currentPiece !== otherPiece) {
                const otherRect = otherPiece.getBoundingClientRect();

                if (
                    currentRect.left < otherRect.right &&
                    currentRect.right > otherRect.left &&
                    currentRect.top < otherRect.bottom &&
                    currentRect.bottom > otherRect.top
                ) {
                    collisionDetected = true;
                }
            }
        });

        return collisionDetected;
    }
});

function updateMoveCounter() {
    document.getElementById('move-counter').textContent = `Se han realizado: ${stopDragCount} movimientos`;
}

function updatePiecePositions() {
    const positions = document.getElementById('positions');
    positions.innerHTML = '';

    pieces.forEach(piece => {
        const name = piece.textContent;
        const left = piece.style.left || '70px';
        const top = piece.style.top || '0px';
        const info = document.createElement('div');
        info.textContent = `Ficha ${name}: [${left}, ${top}]`;
        positions.appendChild(info);

        if (name === 'A' && left === '280px' && top === '0px') {
            document.getElementById('modal-message').textContent = `¡Felicidades, has completado el desafío en ${stopDragCount} movimientos!`;
            document.getElementById('modal').style.display = 'block';

            document.getElementById('retry-button').addEventListener('click', function() {
                reiniciarActividad();
                document.getElementById('modal').style.display = 'none';
            });
        }

        function reiniciarActividad() {
            stopDragCount = 0;
            window.location.reload();
        }
    });
}

updatePiecePositions();

pieces.forEach(piece => {
    piece.ondragstart = () => false;
});
