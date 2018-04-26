// Setup
async function fillContentInit() {
    if(loadData.loadDirection === 'up'){
        await fillContentInitUpwards();
    } else if(loadData.loadDirection === 'down') {
        await fillContentInitDownwards();
    } else {
        console.error('wrong loadDirection value, allowed are "down" (default) and "up"');
    }
}

async function fillContentInitUpwards() {
    renderData.top.entryRef = 0;
    renderData.top.offset = 0;
    renderData.bottom.entryRef = -1;

    let initData = {
        spaceLeftInViewport: renderData.viewport.clientHeight,
        preloadedAbove: 0
    };

    do {
        // this does work a little different then insertAbove,
        // that"s why we need to do it custom here
        let batchEntries = await getNewEntriesAbove();
        if(batchEntries.length === 0) {
            break;
        }

        renderData.bottom.entryRef += batchEntries.length;

        batchEntries.forEach((entry) => {
            entries.splice(0, 0, entry);
            content.insertBefore(entry.nativeElement, content.firstChild);
            entry.height = entry.nativeElement.scrollHeight;
            initData = checkSingleInitialEntryAbove({...initData, entry});
        }, this);
    } while(getAmountCurrentlyNeededAbove() > 0);

    renderData.top.offset = initData.spaceLeftInViewport * -1;
    moveContentBy(initData.spaceLeftInViewport);

    await insertBelow();
}

async function fillContentInitDownwards() {
    renderData.top.entryRef = 0;
    renderData.top.offset = 0;
    renderData.bottom.entryRef = -1;

    let initData = {
        spaceLeftInViewport: renderData.viewport.clientHeight,
        preloadedBelow: 0
    };

    do {
        // this does work a little different then insertAbove,
        // that"s why we need to do it custom here
        let batchEntries = await getNewEntriesBelow();
        if(batchEntries.length === 0) {
            break;
        }

        batchEntries.forEach((entry) => {
            entries.push(entry);
            content.appendChild(entry.nativeElement);
            entry.height = entry.nativeElement.scrollHeight;
            initData = checkSingleInitialEntryBelow({...initData, entry});
        }, this);
    } while(getAmountCurrentlyNeededBelow() > 0);

//    let newEntries = await insertBelow();
//    newEntries.forEach((entry) => {
//        initData = checkSingleInitialEntryBelow({...initData, entry});
//    }, this);

    renderData.bottom.offset = initData.spaceLeftInViewport * -1;

    await insertAbove();
}

function checkSingleInitialEntryAbove(input) {
    if(input.spaceLeftInViewport > 0) {
        input.entry.visible = true;
        input.spaceLeftInViewport -= input.entry.height;
    } else {
        input.entry.visible = false;
        input.preloadedAbove++;
        renderData.top.entryRef++;
        moveContentBy(input.entry.height * -1);
    }

    return input;
}

function checkSingleInitialEntryBelow(input) {
    if(input.spaceLeftInViewport > 0) {
        input.entry.visible = true;
        input.spaceLeftInViewport -= input.entry.height;
        renderData.bottom.entryRef++;
    } else {
        input.entry.visible = false;
        input.preloadedBelow++;
    }

    return input;
}

async function getNewEntriesAbove() {
    let batchElements = await loadData.loadAbove({
        location: "above",
        batchId: loadData.currentBatchId++,
        userDefinedLoadData: loadData.userDefinedLoadData,
        missingEntries: getAmountCurrentlyNeededAbove(),
        entryRef: entries[0],
    });
    let batchEntries = convertElementsToEntries(batchElements);
    return batchEntries;
}

async function getNewEntriesBelow() {
    let batchElements = await loadData.loadBelow({
        location: "below",
        batchId: loadData.currentBatchId++,
        userDefinedLoadData: loadData.userDefinedLoadData,
        missingEntries: getAmountCurrentlyNeededBelow(),
        entryRef: entries[entries.length - 1],
    });
    let batchEntries = convertElementsToEntries(batchElements);
    return batchEntries;
}

// Helpers
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
    return loadData.amountLoadedBelow - entries.length + renderData.bottom.entryRef + 1;
}

function moveContentBy(distance) {
    content.style.top = parseInt(content.style.top.replace('px', '')) + distance + 'px';
}

function convertElementsToEntries(elements) {
    if(!Array.isArray(elements)) {
        // it"s a single new element
        elements = [elements];
    }

    elements = elements.filter((element) => {
        return element != null;
    });

    return elements.map((element) => {
        return generateEntry(element);
    });
}

function generateEntry(element) {
    return {
            nativeElement: element,
            visible: false,
            height: -1,
            batchId: loadData.currentBatchId
        };
}

function printRenderData() {
    console.log('top.elementRef:' + renderData.top.entryRef, 'top.offset:' + renderData.top.offset, 'bottom.elementRef:' + renderData.bottom.entryRef, 'bottom.offset:' + renderData.bottom.offset);
}

// Input varables
var scrollDistance = 10;
var loadData = {
    loadAbove: null,
    loadBelow: null,
    amountLoadedAbove: 0,
    amountLoadedBelow: 0,
    currentBatchId: 0,
    userDefinedLoadData: {},
};

// Globals
var entries = [];
var content = document.createElement('div');
var renderData = {
    wrapper: null,
    viewport: null,
    top: {
        entryRef: 0,
        offset: 0
    },
    bottom: {
        entryRef: 0,
        offset: 0
    }
};

function setup(input = {}, isDebug = false) {
    setInput(input);
    // create content element
    content.style = 'position: relative; top: 0px;';
    content.onwheel = handleScroll;

    // create viewport element
    renderData.viewport = document.createElement('div');
    renderData.viewport.style = 'background-color: red; height: 100%; width: 100%;' + (isDebug ? '' : ' overflow: hidden;');
    // append content to viewport
    renderData.viewport.appendChild(content);

    // append viewport to wrapper
    renderData.wrapper.appendChild(renderData.viewport);

    // await rendering to check visibility
    window.onload = fillContentInit();
}

// Loading
async function insertAbove() {
    let newEntries = [];
    while(getAmountCurrentlyNeededAbove() > 0) {
        let batchEntries = await getNewEntriesAbove();

        if(batchEntries.length === 0) {
            return newEntries;
        }

        renderData.top.entryRef += batchEntries.length;
        renderData.bottom.entryRef += batchEntries.length;

        // insert into data, dom, set height and calculate content movement
        // i missuse the reduce here as a forEach() to save a loop
        let batchEntriesTotalHeight = batchEntries.reduce((result, entry) => {
            entries.splice(0, 0, entry);
            content.insertBefore(entry.nativeElement, content.firstChild);
            entry.height = entry.nativeElement.scrollHeight;
            return result + entry.height;
            newEntries.push(entry);
        }, 0);

        moveContentBy(batchEntriesTotalHeight * -1);
    }

    return newEntries;
}

async function insertBelow() {
    let newEntries = [];
    while(getAmountCurrentlyNeededBelow() > 0) {
        let batchEntries = await getNewEntriesBelow();

        if(batchEntries.length === 0) {
            return newEntries;
        }

        // insert into data, dom and set height
        batchEntries.forEach((entry) => {
            entries.push(entry);
            content.appendChild(entry.nativeElement);
            entry.height = entry.nativeElement.scrollHeight;
            newEntries.push(entry);
        }, this);
    }

    return newEntries;
}

// Removing
function removeAbove() {
    if(!loadData.forgetItemsAbove) {
        renderData.top.entryRef++;
        return;
    }

    let batchToDeleteId = entries[0].batchId;
    let batchToDelete = entries.filter((entry) => {
        return entry.batchId === batchToDeleteId;
    });

    // do we have enough entries loaded above, that we still have enough loaded,
    // if we deleted the batch at the top?
    if(getAmountCurrentlyNeededAbove() + batchToDelete.length < 2) {
        // remove from dom and calculate content movement
        // i missuse the reduce here as a forEach() to save a loop
        let batchEntriesTotalHeight = batchToDelete.reduce((result, entry) => {
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
        renderData.top.entryRef++;
    }
}

function removeBelow() {
    if(!loadData.forgetItemsBelow) {
        return;
    }

    let batchToDeleteId = entries[entries.length - 1].batchId;
    let batchToDelete = entries.filter((entry) => {
        return entry.batchId === batchToDeleteId;
    });

    if(getAmountCurrentlyNeededBelow() + batchToDelete.length - 1) {
        for(let i = 0; i < batchToDelete.length; i++) {
            content.removeChild(content.lastChild);
        }
        entries.splice(batchToDelete.length * -1, batchToDelete.length);
    }
}

// Scrolling
var scrollData = {
    toGetScrolled: 0,
    scrollPromise: Promise.resolve()
}

function handleScroll(event) {
    if(event.deltaY < 0) {
        scrollUp();
        return;
        moveContentUpBy(scrollDistance);
        // movement up, mouse wheel up
        scrollUpUpdateAbove(scrollDistance).then((movedDistance) => {
            moveContentBy(movedDistance);
            scrollUpUpdateBelow(movedDistance);
        });
        return;
    }
    if(event.deltaY > 0) {
        scrollDown();
        return;
    }
}

// scroll upwards

function scrollUpUpdateBelow(movedDistance) {
    renderData.bottom.offset += movedDistance;

    // are we scrolled up so much, that we left the currently last visible entry?
    while(renderData.bottom.offset >= entries[renderData.bottom.entryRef].height) {
        getBottomMostVisibleEntry().visible = false;
        renderData.bottom.offset -= getBottomMostVisibleEntry().height;
        renderData.bottom.entryRef--;

        removeBelow();
    }
}

function scrollUp() {
    // at top -> dont do anything
    if(renderData.top.entryRef === 0 && renderData.top.offset === 0) {
        return;
    }

    moveContentByOnScroll(scrollDistance);
    if(renderData.top.offset >= 0) {
        return;
    }

    scrollData.scrollPromise.then(() => {
        scrollData.scrollPromise = scrollUpUpdateAbove(scrollDistance);
        scrollUpUpdateBelow();
    });
}

// scroll downwards
function scrollDown() {
    // at bottom -> dont do anything
    if(renderData.bottom.entryRef === entries.length - 1 && renderData.bottom.offset <= 0) {
        return;
    }

    moveContentByOnScroll(scrollDistance * -1);
    // movement down, mouse wheel down
    if(renderData.bottom.offset >= 0) {
        return;
    }
    scrollData.scrollPromise.then(() => {
        scrollData.scrollPromise = scrollDownUpdateBelow(scrollDistance);
        scrollDownUpdateAbove();
    });
}

function scrollDownUpdateAbove() {
    // are we scrolled down so much, that we left the currently first visible entry?
    while(renderData.top.offset >= getTopMostVisibleEntry().height) {
        getTopMostVisibleEntry().visible = false;
        renderData.top.offset -= getTopMostVisibleEntry().height;

        removeAbove();
    }
}

async function scrollUpUpdateAboveOld(scrolledDistance) {
    // at top -> dont do anything
    if(renderData.top.entryRef === 0 && renderData.top.offset === 0) {
        return 0;
    }

    // set vars up
    let movedDistance = scrolledDistance;
    renderData.top.offset -= scrolledDistance;

    // are we scrolled up so much, that we left the currently first visible entry?
    while(renderData.top.offset < 0) {
        // is the currently first visible entry the top most of all?
        if(renderData.top.entryRef === 0) {
            // then we moved only so far as we have hidden of the top most entry
            movedDistance += renderData.top.offset;
            renderData.top.offset = 0;
            break;
        }

        renderData.top.entryRef--;
        await insertAbove();

        renderData.top.offset += getTopMostVisibleEntry().height;
        getTopMostVisibleEntry().visible = true;
    }

    return movedDistance;
}

async function scrollUpUpdateAbove() {
    while(renderData.top.offset < 0) {
        if(renderData.top.entryRef > 0) {
            renderData.top.entryRef--;
            renderData.top.offset += getTopMostVisibleEntry().height;
            getTopMostVisibleEntry().visible = true;
        }

        let newEntries = await insertAbove();
        if(newEntries.length === 0
            && renderData.top.entryRef === 0) {
            scrollData.toGetScrolled = 0;
            renderData.top.offset = 0;
            break;
        }

        if(scrollData.toGetScrolled !== 0) {
            let toGetScrolled = scrollData.toGetScrolled;
            scrollData.toGetScrolled = 0;
            moveContentByOnScroll(toGetScrolled);
        }
    }
}

async function scrollDownUpdateBelow() {
    // are we scrolled down so much, that we left the currently last visible entry?
    while(renderData.bottom.offset < 0) {
        // is the currently last visible entry not the bottom most of all?
        if(renderData.bottom.entryRef < entries.length - 1) {
            // then we need to select the next entry below as the currently bottom most visible
            renderData.bottom.entryRef++;
            renderData.bottom.offset += getBottomMostVisibleEntry().height;
            getBottomMostVisibleEntry().visible = true;
        }


        let newEntries = await insertBelow();
        if(newEntries.length === 0
            && renderData.bottom.entryRef === entries.length - 1) {
            // break condition: we reached the bottom most entry of all supplied
            scrollData.toGetScrolled = 0;
            renderData.bottom.offset = 0;
            break;
        }

        // do we still need to scroll down further?
        if(scrollData.toGetScrolled !== 0) {
            let toGetScrolled = scrollData.toGetScrolled;
            scrollData.toGetScrolled = 0;
            moveContentByOnScroll(toGetScrolled);
        }
    }
}

function moveContentByOnScroll(distance) {
    let contentTop = parseInt(content.style.top.replace('px', ''));
    let scrollableDistance = distance > 0
        ? contentTop * -1
        : content.scrollHeight + contentTop - renderData.viewport.clientHeight;

    if(scrollableDistance > Math.abs(distance)) {
        updateContentTopAndRenderDataOffset(distance);
        return;
    }

    if(scrollableDistance > 0) {
        if(distance > 0) {
            updateToGetScrolled(distance - scrollableDistance);
            updateContentTopAndRenderDataOffset(scrollableDistance);
        } else {
            updateToGetScrolled(distance + scrollableDistance);
            updateContentTopAndRenderDataOffset(scrollableDistance * -1);
        }
        return;
    }

    updateToGetScrolled(distance);

    return;

    if(distance > 0) {
        let scrollableDistance = contentTop * -1;

        if(scrollableDistance > distance) {
            content.style.top = contentTop + distance + 'px';
            renderData.top.offset -= distance;
            renderData.bottom.offset += distance;
            return;
        }

        if(scrollableDistance > 0) {
            content.style.top = contentTop + scrollableDistance + 'px';
            scrollData.toGetScrolled += distance - scrollableDistance;
            renderData.top.offset -= scrollableDistance;
            renderData.bottom.offset += scrollableDistance;
            return;
        }

        scrollData.toGetScrolled += distance;
    } else {
        // distance is a negative value, so + means subtraction
        let scrollableDistance = content.scrollHeight + contentTop - renderData.viewport.clientHeight;

        if(scrollableDistance > distance * -1) {
            content.style.top = contentTop + distance + 'px';
            renderData.top.offset -= distance;
            renderData.bottom.offset += distance;
            return;
        }

        if(scrollableDistance > 0) {
            content.style.top = contentTop - scrollableDistance + 'px';
            scrollData.toGetScrolled += distance + scrollableDistance;
            renderData.top.offset += scrollableDistance;
            renderData.bottom.offset -= scrollableDistance;
            return;
        }

        scrollData.toGetScrolled += distance;
    }
}

function updateContentTopAndRenderDataOffset(value) {
    moveContentBy(value);
    renderData.top.offset -= value;
    renderData.bottom.offset += value;
}

function updateToGetScrolled(value) {
    if((value > 0 && scrollData.toGetScrolled < 0)
        || (value < 0 && scrollData.toGetScrolled > 0)) {
        scrollData.toGetScrolled = 0;
    }

    scrollData.toGetScrolled += value;
}

export function setInput(input) {
    if(input == null
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
