const usernameBox = document.getElementById('username-box');
const infoLabel = document.getElementById('info');

function updateInfo(text) {
    infoLabel.innerText = text;
}

function fixUrl(url) {
    // return `https://cors-anywhere.herokuapp.com/${url}`;
    // return `http://www.whateverorigin.org/get?url=${encodeURIComponent(url)}`;
    // return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    return `https://cors.zimjs.com/${url}`;
}

async function getBadgesOnPage(userId, nextPageCursor) {
    const res = await fetch(fixUrl(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100${nextPageCursor ? '&cursor=' + nextPageCursor : ''}`), {
        headers: {
            'Content-Type': 'application/json',
        },
    });

    return res;
}

async function getBadges(userId) {
    const badges = [];

    try {
        let nextPageCursor;

        do {
            const res = await getBadgesOnPage(userId, nextPageCursor);

            const data = await res.json();

            nextPageCursor = data.nextPageCursor;
            const userBadges = data.data;

            for (const badge of userBadges) {
                badges.push(badge);
            }
        } while (nextPageCursor);
    } catch(err) {
        console.error(err);
    }

    return badges;
}

async function getBadgeUniverseId(badgeId) {
    try {
        const res = await fetch(fixUrl(`https://badges.roblox.com/v1/badges/${badgeId}`), {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = await res.json();

        return data.awardingUniverse.id;
    } catch(err) {
        console.error(err);
        return 0;
    }
}

async function getGameThumbnails(universeIds) {
    const thumbnails = [];

    try {
        const idsToUrlParams = universeIds.join(',');

        const res = await fetch(fixUrl(`https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=${idsToUrlParams}&countPerUniverse=5&defaults=true&size=768x432&format=Png&isCircular=false`), {
            headers: {
                'Content-Type': 'application/json',
            },
        });

        const data = (await res.json()).data;

        for (const universeData of data) {
            for (const universeThumbnail of universeData.thumbnails) {
                thumbnails.push(universeThumbnail.imageUrl);
            }
        }
    } catch(err) {
        console.error(err);
        return 0;
    }

    return thumbnails;
}

// Used to ignore multiple badges coming from the same place.
function limitBadgesToOnePerGame(badges) {
    const res = [];
    const donePlaceIds = [];

    for (const badge of badges) {
        if (donePlaceIds.includes(badge.awarder.id)) continue;

        donePlaceIds.push(badge.awarder.id);
        res.push(badge);
    }

    return res;
}

async function load(userId) {
    updateInfo('Getting badges for user... This may take a while');

    let badges = await getBadges(userId);
    badges = limitBadgesToOnePerGame(badges);

    updateInfo('Loading thumbnails...');

    async function createThumbnailImages(thumbnails) {
        for (const thumbnail of thumbnails) {
            const img = document.createElement('img');
            img.src = thumbnail;
            img.setAttribute('width', 384);
            img.setAttribute('height', 216);
            document.getElementById('images').appendChild(img);
        }
    }

    async function loadThumbnailsChunked(start) {
        const universeIds = [];
        let endReached = false;

        let i;
        for (i = start; i < start + 100; i++) {
            const badge = badges[i];
            if (!badge) { endReached = true; break; };

            universeIds.push(await getBadgeUniverseId(badge.id));
        }

        createThumbnailImages(await getGameThumbnails(universeIds));

        updateInfo(`Loading thumbnails... [${i}/${badges.length}]`);

        if (endReached) return;

        await loadThumbnailsChunked(start + 100);
    }

    await loadThumbnailsChunked(0);

    updateInfo(`Loaded thumbnails [${badges.length}/${badges.length}]`);
}

usernameBox.addEventListener('keypress', (e) => {
    if (e.key == 'Enter' || e.keyCode == 13) {
        usernameBox.hidden = true;
        load(usernameBox.value);
        // load(57116727);
    }
});
