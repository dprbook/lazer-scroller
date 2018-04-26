// Input varables
const scrollDistance = 10;
const loadData = {
    loadAbove: null,
    loadBelow: null,
    amountLoadedAbove: 0,
    amountLoadedBelow: 0,
    currentBatchId: 0,
    userDefinedLoadData: {},
};

// Globals
const entries = [];
const content = document.createElement('div');
const renderData = {
    wrapper: null,
    viewport: null,
    top: {
        entryRef: 0,
        offset: 0,
    },
    bottom: {
        entryRef: 0,
        offset: 0,
    },
};
const scrollData = {
    actionId: 0,
    scrollStack: [],
    isScrollingUpQueued: false,
    isScrollingDownQueued: false,
    scrollDistanceRemaining: 0,
    scrollPromise: Promise.resolve(),
};

// Helpers
// TODO: remove unneeded helpers
function getTopMostVisibleEntry() {
    return entries[renderData.top.entryRef];
}

function getBottomMostVisibleEntry() {
    return entries[renderData.bottom.entryRef];
}

// returns how many entries are needed above the first
// visible to satisfy the input.amountLoadedAbove parameter
// if negative, that much more entries are loaded then needed
function getAmountCurrentlyNeededAbove() {
    return loadData.amountLoadedAbove - renderData.top.entryRef;
}

// returns how many entries are needed below the last
// visible to satisfy the input.amountLoadedBelow parameter
// if negative, that much more entries are loaded then needed
function getAmountCurrentlyNeededBelow() {
    // eslint-disable-next-line no-mixed-operators
    return loadData.amountLoadedBelow - entries.length + renderData.bottom.entryRef + 1;
}

function moveContentBy(distance) {
    content.style.top = `${parseInt(content.style.top.replace('px', ''), 10) + distance}px`;
}

function generateEntry(element) {
    return {
        nativeElement: element,
        visible: false,
        height: -1,
        batchId: loadData.currentBatchId,
    };
}

function convertElementsToEntries(elements) {
    let elementsToConvert = Array.isArray(elements) ? elements : [elements];

    elementsToConvert = elementsToConvert.filter(element => element != null);

    return elementsToConvert.map(element => generateEntry(element));
}

// eslint-disable-next-line no-unused-vars
function printVisibleEntries() {
    console.log(entries.filter(e => e.visible).map(e => e.nativeElement.innerHTML));
}

// Loading
async function getNewEntriesAbove() {
    const batchElements = await loadData.loadAbove({
        location: 'above',
        batchId: loadData.currentBatchId,
        userDefinedLoadData: loadData.userDefinedLoadData,
        missingEntries: getAmountCurrentlyNeededAbove(),
        entryRef: entries[0],
    });

    loadData.currentBatchId += 1;
    const batchEntries = convertElementsToEntries(batchElements);
    return batchEntries;
}

async function getNewEntriesBelow() {
    const batchElements = await loadData.loadBelow({
        location: 'below',
        batchId: loadData.currentBatchId,
        userDefinedLoadData: loadData.userDefinedLoadData,
        missingEntries: getAmountCurrentlyNeededBelow(),
        entryRef: entries[entries.length - 1],
    });

    loadData.currentBatchId += 1;
    const batchEntries = convertElementsToEntries(batchElements);
    return batchEntries;
}

async function insertAbove() {
    const newEntries = [];
    while (getAmountCurrentlyNeededAbove() > 0) {
        // eslint-disable-next-line no-await-in-loop
        const batchEntries = await getNewEntriesAbove();

        if (batchEntries.length === 0) {
            return newEntries;
        }

        renderData.top.entryRef += batchEntries.length;
        renderData.bottom.entryRef += batchEntries.length;

        // insert into data, dom, set height and calculate content movement
        // i missuse the reduce here as a forEach() to save a loop
        const batchEntriesTotalHeight = batchEntries.reduce((result, e) => {
            const entry = e;
            entries.splice(0, 0, entry);
            content.insertBefore(entry.nativeElement, content.firstChild);
            entry.height = entry.nativeElement.scrollHeight;
            newEntries.push(entry);
            return result + entry.height;
        }, 0);

        moveContentBy(batchEntriesTotalHeight * -1);
    }

    return newEntries;
}

async function insertBelow() {
    const newEntries = [];
    while (getAmountCurrentlyNeededBelow() > 0) {
        // eslint-disable-next-line no-await-in-loop
        const batchEntries = await getNewEntriesBelow();

        if (batchEntries.length === 0) {
            return newEntries;
        }

        // insert into data, dom and set height
        batchEntries.forEach((e) => {
            const entry = e;
            entries.push(entry);
            content.appendChild(entry.nativeElement);
            entry.height = entry.nativeElement.scrollHeight;
            newEntries.push(entry);
        }, this);
    }

    return newEntries;
}

function checkSingleInitialEntryAbove(heightRemainingInViewport, entry) {
    if (heightRemainingInViewport > 0) {
        // eslint-disable-next-line no-param-reassign
        entry.visible = true;
        return heightRemainingInViewport - entry.height;
    }

    // eslint-disable-next-line no-param-reassign
    entry.visible = false;
    renderData.top.entryRef += 1;
    moveContentBy(entry.height * -1);
    return heightRemainingInViewport;
}

async function fillContentInitUpwards() {
    renderData.top.entryRef = 0;
    renderData.top.offset = 0;
    renderData.bottom.entryRef = -1;

    let heightRemaininginViewport = renderData.viewport.clientHeight;

    const forEachFunc = (entry) => {
        entries.splice(0, 0, entry);
        content.insertBefore(entry.nativeElement, content.firstChild);
        // eslint-disable-next-line no-param-reassign
        entry.height = entry.nativeElement.scrollHeight;
        heightRemaininginViewport = checkSingleInitialEntryAbove(heightRemaininginViewport, entry);
    };

    do {
        // this does work a little different then insertAbove,
        // that's why we need to do it custom here
        // eslint-disable-next-line no-await-in-loop
        const batchEntries = await getNewEntriesAbove();
        if (batchEntries.length === 0) {
            break;
        }

        renderData.bottom.entryRef += batchEntries.length;

        batchEntries.forEach(forEachFunc, this);
    } while (getAmountCurrentlyNeededAbove() > 0);

    renderData.top.offset = heightRemaininginViewport * -1;
    moveContentBy(heightRemaininginViewport);

    await insertBelow();
}

function checkSingleInitialEntryBelow(heightRemainingInViewport, entry) {
    if (heightRemainingInViewport > 0) {
        // eslint-disable-next-line no-param-reassign
        entry.visible = true;
        renderData.bottom.entryRef += 1;
        return heightRemainingInViewport - entry.height;
    }

    // eslint-disable-next-line no-param-reassign
    entry.visible = false;
    return heightRemainingInViewport;
}

async function fillContentInitDownwards() {
    renderData.top.entryRef = 0;
    renderData.top.offset = 0;
    renderData.bottom.entryRef = -1;

    let heightRemainingInViewport = renderData.viewport.clientHeight;

    const forEachFunc = (entry) => {
        entries.push(entry);
        content.appendChild(entry.nativeElement);
        // eslint-disable-next-line no-param-reassign
        entry.height = entry.nativeElement.scrollHeight;
        heightRemainingInViewport = checkSingleInitialEntryBelow(heightRemainingInViewport, entry);
    };

    do {
        // this does work a little different then insertAbove,
        // that's why we need to do it custom here
        // eslint-disable-next-line no-await-in-loop
        const batchEntries = await getNewEntriesBelow();
        if (batchEntries.length === 0) {
            break;
        }

        batchEntries.forEach(forEachFunc, this);
    } while (getAmountCurrentlyNeededBelow() > 0);

    renderData.bottom.offset = heightRemainingInViewport * -1;

    await insertAbove();
}

async function fillContentInit() {
    if (loadData.loadDirection === 'up') {
        await fillContentInitUpwards();
    } else if (loadData.loadDirection === 'down') {
        await fillContentInitDownwards();
    } else {
        console.error('wrong loadDirection value, allowed are "down" (default) and "up"');
    }
}

// Removing
function removeAbove() {
    if (!loadData.forgetItemsAbove) {
        renderData.top.entryRef += 1;
        return;
    }

    const batchToDeleteId = entries[0].batchId;
    const batchToDelete = entries.filter(entry => entry.batchId === batchToDeleteId);

    // do we have enough entries loaded above, that we still have enough loaded,
    // if we deleted the batch at the top?
    if (getAmountCurrentlyNeededAbove() + batchToDelete.length < 2) {
        // remove from dom and calculate content movement
        // i missuse the reduce here as a forEach() to save a loop
        const batchEntriesTotalHeight = batchToDelete.reduce((result, entry) => {
            content.removeChild(content.firstChild);
            return result + entry.height;
        }, 0);
        // move content
        moveContentBy(batchEntriesTotalHeight);

        // remove from data
        entries.splice(0, batchToDelete.length);

        renderData.bottom.entryRef -= batchToDelete.length;
        renderData.top.entryRef -= batchToDelete.length - 1;
    } else {
        renderData.top.entryRef += 1;
    }
}

function removeBelow() {
    if (!loadData.forgetItemsBelow) {
        return;
    }

    const batchToDeleteId = entries[entries.length - 1].batchId;
    const batchToDelete = entries.filter(entry => entry.batchId === batchToDeleteId);

    if (getAmountCurrentlyNeededBelow() * -1 >= batchToDelete.length) {
        for (let i = 0; i < batchToDelete.length; i++) {
            content.removeChild(content.lastChild);
        }
        entries.splice(batchToDelete.length * -1, batchToDelete.length);
    }
}

// Scrolling

// scroll upwards
function updateContentTopAndRenderDataOffset(value) {
    moveContentBy(value);
    renderData.top.offset -= value;
    renderData.bottom.offset += value;
}

function updateToGetScrolled(value) {
    //
    if ((value > 0 && scrollData.scrollDistanceRemaining < 0)
        || (value < 0 && scrollData.scrollDistanceRemaining > 0)) {
        scrollData.scrollDistanceRemaining = 0;
    }

    scrollData.scrollDistanceRemaining += value;
}

function moveContentByOnScroll(distance) {
    const contentTop = parseInt(content.style.top.replace('px', ''), 10);
    const scrollableDistance = distance > 0
        ? contentTop * -1
    // eslint-disable-next-line no-mixed-operators
        : content.scrollHeight + contentTop - renderData.viewport.clientHeight;

    if (scrollableDistance > Math.abs(distance)) {
        updateContentTopAndRenderDataOffset(distance);
        return;
    }

    if (scrollableDistance > 0) {
        if (distance > 0) {
            updateToGetScrolled(distance - scrollableDistance);
            updateContentTopAndRenderDataOffset(scrollableDistance);
        } else {
            updateToGetScrolled(distance + scrollableDistance);
            updateContentTopAndRenderDataOffset(scrollableDistance * -1);
        }

        return;
    }

    updateToGetScrolled(distance);
}

async function scrollUpUpdateAbove() {
    const { actionId } = scrollData;
    scrollData.actionId += 1;

    while (renderData.top.offset < 0) {
        if (renderData.top.entryRef > 0) {
            renderData.top.entryRef -= 1;
            renderData.top.offset += getTopMostVisibleEntry().height;
            getTopMostVisibleEntry().visible = true;
        }

        // eslint-disable-next-line no-await-in-loop
        const newEntries = await insertAbove();
        // break condition: we reached the top most element of all supplied
        if (newEntries.length === 0
            && renderData.top.entryRef === 0
            && renderData.top.offset === 0) {
            scrollData.scrollDistanceRemaining = 0;
            renderData.top.offset = 0;
            break;
        }

        if (scrollData.scrollDistanceRemaining !== 0) {
            const { scrollDistanceRemaining } = scrollData;
            scrollData.scrollDistanceRemaining = 0;
            moveContentByOnScroll(scrollDistanceRemaining);
        }
    }

    // printVisibleEntries();
}

function scrollUpUpdateBelow() {
    const { actionId } = scrollData;
    scrollData.actionId += 1;

    // are we scrolled up so much, that we left the currently last visible entry?
    for (let bottomMostVisibleEntry = getBottomMostVisibleEntry();
        renderData.bottom.offset >= bottomMostVisibleEntry.height;
        bottomMostVisibleEntry = getBottomMostVisibleEntry()) {
        bottomMostVisibleEntry.visible = false;
        renderData.bottom.offset -= bottomMostVisibleEntry.height;
        renderData.bottom.entryRef -= 1;

        removeBelow();
    }

    // printVisibleEntries();
}

async function scrollUp() {
    // at top -> dont do anything
    if (renderData.top.entryRef === 0 && renderData.top.offset === 0) {
        return;
    }

    moveContentByOnScroll(scrollDistance);
    scrollUpUpdateBelow();
    if (renderData.top.offset >= 0) {
        return;
    }

    await scrollUpUpdateAbove(scrollDistance);
    scrollUpUpdateBelow();
}

// scroll downwards
function scrollDownUpdateAbove() {
    const { actionId } = scrollData;
    scrollData.actionId += 1;

    // are we scrolled down so much, that we left the currently first visible entry?
    while (renderData.top.offset >= getTopMostVisibleEntry().height) {
        getTopMostVisibleEntry().visible = false;
        renderData.top.offset -= getTopMostVisibleEntry().height;

        removeAbove();
    }

    // printVisibleEntries();
}

async function scrollDownUpdateBelow() {
    const { actionId } = scrollData;
    scrollData.actionId += 1;

    // are we scrolled down so much, that we left the currently last visible entry?
    while (renderData.bottom.offset < 0) {
        // is the currently last visible entry not the bottom most of all?
        if (renderData.bottom.entryRef < entries.length - 1) {
            // then we need to select the next entry below as the currently bottom most visible
            renderData.bottom.entryRef += 1;
            renderData.bottom.offset += getBottomMostVisibleEntry().height;
            getBottomMostVisibleEntry().visible = true;
        }

        // eslint-disable-next-line no-await-in-loop
        const newEntries = await insertBelow();
        if (newEntries.length === 0
            && renderData.bottom.entryRef === entries.length - 1
            && renderData.bottom.offset === 0) {
            // break condition: we reached the bottom most entry of all supplied
            scrollData.scrollDistanceRemaining = 0;
            renderData.bottom.offset = 0;
            break;
        }

        // do we still need to scroll down further?
        if (scrollData.scrollDistanceRemaining !== 0) {
            const { scrollDistanceRemaining } = scrollData;
            scrollData.scrollDistanceRemaining = 0;
            moveContentByOnScroll(scrollDistanceRemaining);
        }
    }


    // printVisibleEntries();
}

async function scrollDown() {
    // at bottom -> dont do anything
    if (renderData.bottom.entryRef === entries.length - 1 && renderData.bottom.offset <= 0) {
        return;
    }

    moveContentByOnScroll(scrollDistance * -1);
    // movement down, mouse wheel down
    if (renderData.bottom.offset >= 0) {
        return;
    }

    await scrollDownUpdateBelow(scrollDistance);
    scrollDownUpdateAbove();
}

function handleScroll(event) {
    if (event.deltaY < 0) {
        if (scrollData.isScrollingUpQueued) {
            return;
        }

        scrollData.isScrollingUpQueued = true;
    } else {
        if (scrollData.isScrollingDownQueued) {
            return;
        }

        scrollData.isScrollingDownQueued = true;
    }

    scrollData.scrollStack.push(event);
    scrollData.scrollPromise.then(() => {
        const nextEvent = scrollData.scrollStack.shift();
        if (nextEvent.deltaY < 0) {
            scrollData.isScrollingUpQueued = false;
            scrollData.scrollPromise = scrollUp();
        } else {
            scrollData.isScrollingDownQueued = false;
            scrollData.scrollPromise = scrollDown();
        }
    });
}


function setOptions(input) {
    if (input == null
        || input.wrapperId == null
        || input.loadAbove == null
        || input.loadBelow == null
        || input.amountLoadedAbove == null
        || input.amountLoadedAbove < 0
        || input.amountLoadedBelow == null
        || input.amountLoadedBelow < 0) {
        console.error('insufficient input variable');
    }

    // set load data
    loadData.loadAbove = input.loadAbove;
    loadData.loadBelow = input.loadBelow;
    loadData.amountLoadedAbove = input.amountLoadedAbove;
    loadData.amountLoadedBelow = input.amountLoadedBelow;
    loadData.forgetItemsAbove = input.forgetItemsAbove != null ? input.forgetItemsAbove : true;
    loadData.forgetItemsBelow = input.forgetItemsBelow != null ? input.forgetItemsBelow : true;
    loadData.loadDirection = input.loadDirection != null ? input.loadDirection : 'down';
    renderData.wrapper = document.getElementById(input.wrapperId);
}

// Setup
// eslint-disable-next-line no-unused-vars
function lazerscroller(options, isDebug) {
    setOptions(options);
    // create content element
    content.style = 'position: relative; top: 0px;';
    content.onwheel = handleScroll;

    // create viewport element
    renderData.viewport = document.createElement('div');
    renderData.viewport.style = `background-color: red; height: 100%; width: 100%;${isDebug ? '' : ' overflow: hidden;'}`;
    // append content to viewport
    renderData.viewport.appendChild(content);

    // append viewport to wrapper
    renderData.wrapper.appendChild(renderData.viewport);

    // await rendering to check visibility
    window.onload = fillContentInit();
}

//    async function scrollUpUpdateAboveOld(scrolledDistance) {
//        // at top -> dont do anything
//        if (renderData.top.entryRef === 0 && renderData.top.offset === 0) {
//            return 0;
//        }
//
//        // set vars up
//        let movedDistance = scrolledDistance;
//        renderData.top.offset -= scrolledDistance;
//
//        // are we scrolled up so much, that we left the currently first visible entry?
//        while (renderData.top.offset < 0) {
//            // is the currently first visible entry the top most of all?
//            if (renderData.top.entryRef === 0) {
//                // then we moved only so far as we have hidden of the top most entry
//                movedDistance += renderData.top.offset;
//                renderData.top.offset = 0;
//                break;
//            }
//
//            renderData.top.entryRef--;
//            await insertAbove();
//
//            renderData.top.offset += getTopMostVisibleEntry().height;
//            getTopMostVisibleEntry().visible = true;
//        }
//
//        return movedDistance;
//    }
