var topHasMax = false, 
    topMax = 1,
    topBatchSize = 4,
    bottomHasMax = true,
    bottomMax = 20,
    bottomBatchSize = 3,
    fixedEntryHeight = false;


async function generateAbove(loadData) {
    await sleep();

    let topId = loadData.entryRef != null ? parseInt(loadData.entryRef.nativeElement.dataset.id) : 0;
    let result = [];

    for(let i = 0; i < topBatchSize; i++) {
        let el = generateSingleAbove(topId);
        if(el == null) {
            continue;
        }
        topId = parseInt(el.innerHTML);
        result.push(el);
    }

    return result;
}

function generateSingleAbove(topId) {
    if(this.topHasMax && topId === topMax) {
        return null;
    }

    let id = topId - 1;
    let el = document.createElement("div");
    el.style = "background-color: " + (id % 2 == 0 ? "blue" : "green") + "; width: 80px; margin-left: 10px;" 
        + (fixedEntryHeight ? "height: " + (id % 3 == 0 ? 20 : 25) + "px;" : "");
    el.innerHTML = id;
    el.dataset.id = id;
    return el;
}

async function generateBelow(loadData) {
    await sleep();

    let bottomId = loadData.entryRef != null ? parseInt(loadData.entryRef.nativeElement.dataset.id) : 0;
    let result = [];

    for(let i = 0; i < bottomBatchSize; i++) {
        let el = generateSingleBelow(bottomId);
        if(el == null) {
            continue;
        }
        bottomId = parseInt(el.innerHTML);
        result.push(el);
    }

    return result;
}

function generateSingleBelow(bottomId) {
    if(this.bottomHasMax && bottomId === bottomMax) {
        return null;
    }

    let id = bottomId + 1;
    let el = document.createElement("div");
    el.style = "background-color: " + (id % 2 == 0 ? "blue" : "green") + "; width: 80px; margin-left: 10px;" 
        + (fixedEntryHeight ? "height: " + (id % 3 == 0 ? 20 : 25) + "px;" : "");
    el.innerHTML = id;
    el.dataset.id = id;
    return el;
}

function sleep() {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve('resolved');
        }, Math.random() % 3000 + 500);
    });
}
