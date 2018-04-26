const topHasMax = false;
const topMax = 1;
const topBatchSize = 4;
const bottomHasMax = true;
const bottomMax = 20;
const bottomBatchSize = 3;
const fixedEntryHeight = false;

function sleep() {
    // eslint-disable-next-line no-mixed-operators
    const sleepTime = Math.random() % 3000 + 500;

    return new Promise((resolve) => {
        setTimeout(() => {
            resolve('resolved');
        }, sleepTime);
    });
}

function generateSingleAbove(topId) {
    if (topHasMax && topId === topMax) {
        return null;
    }

    const id = topId - 1;
    const el = document.createElement('div');
    el.style = `background-color: ${id % 2 === 0 ? 'blue' : 'green'}; width: 80px; margin-left: 10px;${
        fixedEntryHeight ? `height: ${id % 3 === 0 ? 20 : 25}px;` : ''}`;
    el.innerHTML = id;
    el.dataset.id = id;
    return el;
}

// eslint-disable-next-line no-unused-vars
async function generateAbove(loadData) {
    await sleep();

    let topId = loadData.entryRef != null
        ? parseInt(loadData.entryRef.nativeElement.dataset.id, 10)
        : 0;

    const result = [];

    for (let i = 0; i < topBatchSize; i++) {
        const el = generateSingleAbove(topId);
        if (el != null) {
            topId = parseInt(el.innerHTML, 10);
            result.push(el);
        }
    }

    console.log('generateAbove', topId);
    return result;
}

function generateSingleBelow(bottomId) {
    if (bottomHasMax && bottomId === bottomMax) {
        return null;
    }

    const id = bottomId + 1;
    const el = document.createElement('div');
    el.style = `background-color: ${id % 2 === 0 ? 'blue' : 'green'}; width: 80px; margin-left: 10px;${
        fixedEntryHeight ? `height: ${id % 3 === 0 ? 20 : 25}px;` : ''}`;
    el.innerHTML = id;
    el.dataset.id = id;
    return el;
}

// eslint-disable-next-line no-unused-vars
async function generateBelow(loadData) {
    await sleep();

    let bottomId = loadData.entryRef != null
        ? parseInt(loadData.entryRef.nativeElement.dataset.id, 10)
        : 0;

    const result = [];

    for (let i = 0; i < bottomBatchSize; i++) {
        const el = generateSingleBelow(bottomId);
        if (el != null) {
            bottomId = parseInt(el.innerHTML, 10);
            result.push(el);
        }
    }

    console.log('generateBelow', bottomId);
    return result;
}
