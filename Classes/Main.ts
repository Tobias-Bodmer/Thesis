//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"

namespace Game {
    export enum GAMESTATES {
        PLAYING,
        PAUSE
    }

    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;


    //#region "DomElements"
    export let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("Canvas");
    window.addEventListener("load", start);

    document.getElementById("Option").addEventListener("click", () => {
        document.getElementById("Startscreen").style.visibility = "hidden";
        document.getElementById("Optionscreen").style.visibility = "visible";
    });

    document.getElementById("Credits").addEventListener("click", () => {
        document.getElementById("Startscreen").style.visibility = "hidden";
        document.getElementById("Creditscreen").style.visibility = "visible";
    });

    document.getElementById("Ranged").addEventListener("click", playerChoice);
    document.getElementById("Melee").addEventListener("click", playerChoice);

    document.getElementById("BackHost").addEventListener("click", back);
    document.getElementById("BackOption").addEventListener("click", back);
    document.getElementById("BackCredit").addEventListener("click", back);

    function back(_e: MouseEvent) {
        document.getElementById("Creditscreen").style.visibility = "hidden";
        document.getElementById("Optionscreen").style.visibility = "hidden";
        document.getElementById("Hostscreen").style.visibility = "hidden";
        document.getElementById("Startscreen").style.visibility = "visible";
    }
    //#endregion "DomElements"

    //#region "PublicVariables"
    export let gamestate: GAMESTATES = GAMESTATES.PAUSE;
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    export let graph: ƒ.Node = new ƒ.Node("Graph");

    viewport.initialize("Viewport", graph, cmpCamera, canvas);

    export let runs: number = 0;
    export let newGamePlus: number = 0;

    export let avatar1: Player.Player;
    export let avatar2: Player.Player;

    export let currentRoom: Generation.Room;
    export let miniMap: UI.Minimap;

    export let deltaTime: number;

    export let serverPredictionAvatar: Networking.ServerPrediction;

    export let currentNetObj: Interfaces.INetworkObjects[] = [];

    export let entities: Entity.Entity[] = [];
    export let enemies: Enemy.Enemy[] = [];
    export let bullets: Bullets.Bullet[] = [];
    export let items: Items.Item[] = [];

    export let coolDowns: Ability.Cooldown[] = [];
    //JSON
    export let enemiesJSON: Entity.Entity[];
    export let avatarsJSON: Entity.Entity[];
    export let internalItemJSON: Items.InternalItem[];
    export let buffItemJSON: Items.BuffItem[];

    export let damageBuffJSON: Buff.DamageBuff[];
    export let attributeBuffJSON: Buff.AttributesBuff[];

    export let bulletsJSON: Bullets.Bullet[];
    export let loaded = false;
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    const damper: number = 3.5;
    //#endregion "PrivateVariables"



    //#region "essential"
    async function init() {
        cmpCamera.mtxPivot.translation = ƒ.Vector3.ZERO();
        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);

        if (Networking.client.id == Networking.client.idHost) {
            Items.ItemGenerator.fillPool();
            while (true) {
                Generation.procedualRoomGeneration();
                if (!Generation.generationFailed) {
                    break;
                }
                console.warn("GENERATION FAILED -> RESTART GENERATION");
            }
            serverPredictionAvatar = new Networking.ServerPrediction(null);
        }
    }

    function update(): void {
        findGameObjects();
        deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        cameraUpdate();

        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            serverPredictionAvatar.update();
        }

        UI.updateUI();

        draw();
    }

    function findGameObjects(): void {
        items = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).tag == Tag.TAG.ITEM);
        bullets = <Bullets.Bullet[]>graph.getChildren().filter(element => (<Bullets.Bullet>element).tag == Tag.TAG.BULLET);
        entities = <Entity.Entity[]>graph.getChildren().filter(child => (<Entity.Entity>child) instanceof Entity.Entity);
        enemies = <Enemy.Enemy[]>graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY);
        currentRoom = (<Generation.Room>Game.graph.getChildren().find(elem => (<Generation.Room>elem).tag == Tag.TAG.ROOM));
        currentNetObj = setNetObj(graph.getChildren().filter(elem => Networking.isNetworkObject(elem)));
    }

    function setNetObj(_netOj: Game.ƒ.Node[]): Interfaces.INetworkObjects[] {
        let tempNetObjs: Interfaces.INetworkObjects[] = [];
        _netOj.forEach(obj => {
            tempNetObjs.push(<Interfaces.INetworkObjects>{ netId: Networking.getNetId(obj), netObjectNode: obj })
        })
        return tempNetObjs;
    }



    function setClient() {
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN && Networking.client.idRoom.toLowerCase() != "lobby") {
            Networking.setClient();
            return;
        } else {
            setTimeout(() => { setClient() }, 100);
        }
    }

    function readySate() {
        if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
            Networking.setClientReady();
        } else {
            setTimeout(() => { readySate() }, 100);
        }
    }

    function startLoop() {
        if (Networking.client.id != Networking.client.idHost && avatar2 != undefined && Game.currentRoom != undefined) {
            Networking.loaded();
        }
        if (Game.loaded) {
            ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, deltaTime);
            document.getElementById("UI").style.visibility = "visible";
            graph.appendChild(avatar1);
            graph.appendChild(avatar2);
        } else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }

    function start() {
        loadTextures();
        loadJSON();
        Networking.connecting();

        //TODO: add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";

            waitOnConnection();
            async function waitOnConnection() {
                setClient();

                if (Networking.client.idRoom.toLowerCase() == "lobby") {
                    if (document.getElementById("Hostscreen").style.visibility.toLowerCase() != "visible") {
                        document.getElementById("Hostscreen").style.visibility = "visible";
                    }
                }
                if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
                    if (Networking.client.id == Networking.client.idHost) {
                        document.getElementById("IMHOST").style.visibility = "visible";
                    }

                    await init();
                    gamestate = GAMESTATES.PLAYING;

                    Networking.spawnPlayer();

                    startLoop();
                } else {
                    setTimeout(waitOnConnection, 300);
                }

            }

            document.getElementById("Host").addEventListener("click", Networking.createRoom);
            document.getElementById("Join").addEventListener("click", () => {
                let roomId: string = (<HTMLInputElement>document.getElementById("Room")).value;
                Networking.joinRoom(roomId);
            });

            updateRooms();
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.idRoom.toLocaleLowerCase() != "lobby") {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("RoomId").parentElement.style.visibility = "hidden";

                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                } else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }

            async function updateRooms() {
                if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
                    Networking.getRooms();
                    return;
                } else {
                    setTimeout(() => {
                        updateRooms();
                    }, 200);
                }
            }
        });
    }

    export function setMiniMap() {
        if (Networking.client.id == Networking.client.idHost) {
            graph.removeChild(miniMap);
            let roomInfos: Interfaces.IMinimapInfos[] = [];
            let coords: Game.ƒ.Vector2[] = Generation.getCoordsFromRooms();
            for (let i = 0; i < coords.length; i++) {
                roomInfos.push(<Interfaces.IMinimapInfos>{ coords: coords[i], roomType: Generation.rooms.find(room => room.coordinates == coords[i]).roomType })
            }
            miniMap = new UI.Minimap(roomInfos);
            graph.addChild(miniMap);
        }
    }

    function playerChoice(_e: Event) {
        if ((<HTMLButtonElement>_e.target).id == "Ranged") {
            avatar1 = new Player.Ranged(Entity.ID.RANGED);
        }
        if ((<HTMLButtonElement>_e.target).id == "Melee") {
            avatar1 = new Player.Melee(Entity.ID.MELEE);
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
        readySate();
    }

    function pauseCheck() {
        if ((window.screenX < -window.screen.availWidth) && (window.screenY < -window.screen.availHeight)) {
            pause(true, false);

            setTimeout(() => {
                pauseCheck();
            }, 100);
        } else {
            playing(true, false);
        }
    }

    export function pause(_sync: boolean, _triggerOption: boolean) {
        if (gamestate == GAMESTATES.PLAYING) {
            if (_sync) {
                Networking.setGamestate(false);
            } if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "visible";

                let back = document.getElementById("BackOption");
                let backClone = back.cloneNode(true);

                back.parentNode.replaceChild(backClone, back);

                document.getElementById("BackOption").addEventListener("click", () => {
                    document.getElementById("Optionscreen").style.visibility = "hidden";
                });
            }
            gamestate = GAMESTATES.PAUSE;
            ƒ.Loop.stop();
        }
    }

    export function playing(_sync: boolean, _triggerOption: boolean) {
        if (gamestate == GAMESTATES.PAUSE) {
            if (_sync) {
                Networking.setGamestate(true);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "hidden";
            }
            gamestate = GAMESTATES.PLAYING;
            ƒ.Loop.continue();
        }
    }

    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        enemiesJSON = (<Entity.Entity[]>loadEnemy.enemies);
        avatarsJSON = (<Entity.Entity[]>loadEnemy.avatars);

        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        internalItemJSON = (<Items.InternalItem[]>loadItem.internalItems);
        buffItemJSON = (<Items.BuffItem[]>loadItem.buffItems);


        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        bulletsJSON = (<Bullets.Bullet[]>loadBullets.standardBullets);

        const loadBuffs = await (await fetch("./Resources/BuffStorage.json")).json();
        damageBuffJSON = (<Buff.DamageBuff[]>loadBuffs.damageBuff);
        attributeBuffJSON = (<Buff.AttributesBuff[]>loadBuffs.attributeBuff);

        console.warn("all JSON loaded");

    }

    export async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtNormalRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtBossRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtMerchantRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtTreasureRoom.load("./Resources/Image/Rooms/swampStandard.png");
        await Generation.txtChallengeRoom.load("./Resources/Image/Rooms/challengeStandard.png");

        await Generation.txtWallNorth.load("./Resources/Image/Rooms/wallNorth.png");
        await Generation.txtWallSouth.load("./Resources/Image/Rooms/wallSouth.png");
        await Generation.txtWallEast.load("./Resources/Image/Rooms/wallEast.png");
        await Generation.txtWallWest.load("./Resources/Image/Rooms/wallWest.png");

        await Generation.txtDoorNorth.load("./Resources/Image/Rooms/doorNorth.png");
        await Generation.txtDoorSouth.load("./Resources/Image/Rooms/doorSouth.png");
        await Generation.txtDoorEast.load("./Resources/Image/Rooms/doorEast.png");
        await Generation.txtDoorWest.load("./Resources/Image/Rooms/doorWest.png");
        await Generation.txtDoorExit.load("./Resources/Image/Rooms/doorExit.png");

        await Bullets.bulletTxt.load("./Resources/Image/Projectiles/arrow.png");
        await Bullets.waterBallTxt.load("./Resources/Image/Projectiles/waterBall.png")
        await Bullets.thorsHammerTxt.load("./Resources/Image/Projectiles/thorsHammerUp.png")

        //UI
        await UI.txtZero.load("./Resources/Image/white0.png");
        await UI.txtOne.load("./Resources/Image/white1.png");
        await UI.txtTow.load("./Resources/Image/white2.png");
        await UI.txtThree.load("./Resources/Image/white3.png");
        await UI.txtFour.load("./Resources/Image/white4.png");
        await UI.txtFive.load("./Resources/Image/white5.png");
        await UI.txtSix.load("./Resources/Image/white6.png");
        await UI.txtSeven.load("./Resources/Image/white7.png");
        await UI.txtEight.load("./Resources/Image/white8.png");
        await UI.txtNine.load("./Resources/Image/white9.png");
        await UI.txtTen.load("./Resources/Image/white10.png");

        //UI particle
        await UI.healParticle.load("./Resources/Image/Particles/healing.png");
        await UI.poisonParticle.load("./Resources/Image/Particles/poison.png");
        await UI.burnParticle.load("./Resources/Image/Particles/poison.png");
        await UI.bleedingParticle.load("./Resources/Image/Particles/bleeding.png");
        await UI.slowParticle.load("./Resources/Image/Particles/slow.png");
        await UI.immuneParticle.load("./Resources/Image/Particles/immune.png");
        await UI.exhaustedParticle.load("./Resources/Image/Particles/exhausted.png");
        await UI.furiousParticle.load("./Resources/Image/Particles/furious.png");


        await UI.commonParticle.load("./Resources/Image/Particles/Rarity/common.png");
        await UI.rareParticle.load("./Resources/Image/Particles/Rarity/rare.png");
        await UI.epicParticle.load("./Resources/Image/Particles/Rarity/epic.png");
        await UI.legendaryParticle.load("./Resources/Image/Particles/Rarity/legendary.png");


        await Entity.txtShadow.load("./Resources/Image/Particles/shadow.png");
        await Entity.txtShadowRound.load("./Resources/Image/Particles/roundShadow.png");


        //Minimap
        await UI.normalRoom.load("./Resources/Image/Minimap/normal.png");
        await UI.challengeRoom.load("./Resources/Image/Minimap/challenge.png");
        await UI.merchantRoom.load("./Resources/Image/Minimap/merchant.png");
        await UI.treasureRoom.load("./Resources/Image/Minimap/treasure.png");
        await UI.bossRoom.load("./Resources/Image/Minimap/boss.png");

        //AVATAR
        await AnimationGeneration.txtRangedIdle.load("./Resources/Image/Player/rangedIdle.png");
        await AnimationGeneration.txtRangedWalk.load("./Resources/Image/Player/rangedWalk.png");
        await AnimationGeneration.txtRangedIdleLeft.load("./Resources/Image/Player/rangedIdle_left.png");
        await AnimationGeneration.txtRangedWalkLeft.load("./Resources/Image/Player/rangedWalk_left.png");

        //ENEMY
        await AnimationGeneration.txtBatIdle.load("./Resources/Image/Enemies/bat/batIdle.png");

        await AnimationGeneration.txtRedTickIdle.load("./Resources/Image/Enemies/tick/redTickIdle.png");
        await AnimationGeneration.txtRedTickWalk.load("./Resources/Image/Enemies/tick/redTickWalk.png");

        await AnimationGeneration.txtSmallTickIdle.load("./Resources/Image/Enemies/smallTick/smallTickIdle.png");
        await AnimationGeneration.txtSmallTickWalk.load("./Resources/Image/Enemies/smallTick/smallTickWalk.png");

        await AnimationGeneration.txtSkeletonIdle.load("./Resources/Image/Enemies/skeleton/skeletonIdle.png");
        await AnimationGeneration.txtSkeletonWalk.load("./Resources/Image/Enemies/skeleton/skeletonWalk.png");

        await AnimationGeneration.txtOgerIdle.load("./Resources/Image/Enemies/oger/ogerIdle.png");
        await AnimationGeneration.txtOgerWalk.load("./Resources/Image/Enemies/oger/ogerWalk.png");
        await AnimationGeneration.txtOgerAttack.load("./Resources/Image/Enemies/oger/ogerAttack.png");

        await AnimationGeneration.txtSummonerIdle.load("./Resources/Image/Enemies/summoner/summonerIdle.png");
        await AnimationGeneration.txtSummonerSummon.load("./Resources/Image/Enemies/summoner/summonerSmash.png");
        await AnimationGeneration.txtSummonerTeleport.load("./Resources/Image/Enemies/summoner/summonerTeleport.png");


        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtDmgUp.load("./Resources/Image/Items/damageUp.png");
        await Items.txtSpeedUp.load("./Resources/Image/Items/speedUp.png");
        await Items.txtProjectilesUp.load("./Resources/Image/Items/projectilesUp.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
        await Items.txtScaleUp.load("./Resources/Image/Items/scaleUp.png");
        await Items.txtScaleDown.load("./Resources/Image/Items/scaleDown.png");
        await Items.txtHomeComing.load("./Resources/Image/Items/homecoming.png");
        await Items.txtThorsHammer.load("./Resources/Image/Items/thorsHammer.png");
        await Items.txtToxicRelationship.load("./Resources/Image/Items/toxicRelationship.png");
        await Items.txtGetStronko.load("./Resources/Image/Items/getStronko.png");
        await Items.txtGetWeako.load("./Resources/Image/Items/getWeako.png");


        AnimationGeneration.generateAnimationObjects();

        console.clear();
    }

    function draw(): void {
        viewport.draw();
    }

    export function cameraUpdate() {
        let direction = ƒ.Vector2.DIFFERENCE(avatar1.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        if (Networking.client.id == Networking.client.idHost) {
            direction.scale(deltaTime * damper);
        } else {
            direction.scale(avatar1.client.minTimeBetweenTicks * damper);
        }
        cmpCamera.mtxPivot.translate(new ƒ.Vector3(-direction.x, direction.y, 0), true);
        if (miniMap != undefined) {
            miniMap.mtxLocal.translation = new ƒ.Vector3(cmpCamera.mtxPivot.translation.x + miniMap.offsetX, cmpCamera.mtxPivot.translation.y + miniMap.offsetY, 0);
        }
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    //#endregion "essential"

}
