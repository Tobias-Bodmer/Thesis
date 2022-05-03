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
    // window.addEventListener("load", init);
    window.addEventListener("load", start);

    document.getElementById("Ranged").addEventListener("click", playerChoice);
    document.getElementById("Melee").addEventListener("click", playerChoice);
    //#endregion "DomElements"

    //#region "PublicVariables"
    export let gamestate: GAMESTATES = GAMESTATES.PAUSE;
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    export let graph: ƒ.Node = new ƒ.Node("Graph");

    export let avatar1: Player.Player;
    export let avatar2: Player.Player;

    export let currentRoom: Generation.Room;
    export let miniMap: UI.Minimap;

    export let connected: boolean = false;
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
    export let internalItemJSON: Items.InternalItem[];
    export let buffItemJSON: Items.BuffItem[];

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

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        if (Networking.client.id == Networking.client.idHost) {
            Generation.generateRooms();
            serverPredictionAvatar = new Networking.ServerPrediction(null);
        }

        graph.appendChild(avatar1);

        ƒAid.addStandardLightComponents(graph);
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
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
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
        if (Networking.client.id != Networking.client.idHost && avatar2 != undefined) {
            Networking.loaded();
        }
        if (Game.loaded) {
            ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, deltaTime);
        } else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }

    function start() {
        loadTextures();
        // loadJSON();

        //TODO: add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";

            Networking.connecting();

            waitOnConnection();
            async function waitOnConnection() {
                setClient();
                if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
                    if (Networking.client.id == Networking.client.idHost) {
                        document.getElementById("IMHOST").style.visibility = "visible";
                    }
                    await loadJSON();
                    await init();
                    gamestate = GAMESTATES.PLAYING;
                    // EnemySpawner.spawnEnemies();

                    if (Networking.client.id == Networking.client.idHost) {
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.REDTICK, new ƒ.Vector2(3, 3), avatar1);
                        // EnemySpawner.spawnMultipleEnemiesAtRoom(5, Game.currentRoom.mtxLocal.translation.toVector2());
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.ENEMYSMASH, Entity.ID.OGER, new ƒ.Vector2(3, 3), null);
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new ƒ.Vector2(3, 3), null);
                    }

                    //#region init Items
                    if (Networking.client.id == Networking.client.idHost) {
                        // item1 = new Items.BuffItem(Items.ITEMID.TOXICRELATIONSHIP, new ƒ.Vector2(0, 2), null);
                        // let item2 = new Items.InternalItem(Items.ITEMID.SCALEDOWN, new ƒ.Vector2(0, -2), null);
                        // let item3 = new Items.InternalItem(Items.ITEMID.SCALEUP, new ƒ.Vector2(-2, 0), null);


                        // graph.appendChild(item1);
                        // graph.appendChild(item2);
                        // graph.appendChild(item3);

                    }

                    Networking.spawnPlayer();


                    if (Networking.client.id == Networking.client.idHost) {
                        let roomInfos: Interfaces.IMinimapInfos[] = [];
                        for (let i = 0; i < Generation.usedPositions.length; i++) {
                            roomInfos.push(<Interfaces.IMinimapInfos>{ coords: Generation.usedPositions[i], roomType: Generation.rooms.find(room => room.coordinates == Generation.usedPositions[i]).roomType })
                        }
                        miniMap = new UI.Minimap(roomInfos);
                        graph.addChild(miniMap);
                    }


                    startLoop();
                } else {
                    setTimeout(waitOnConnection, 300);
                }

            }


            document.getElementById("Host").addEventListener("click", Networking.setHost);

            waitForHost();
            function waitForHost() {
                if (Networking.clients.length >= 2) {
                    document.getElementById("Hostscreen").style.visibility = "visible";
                    return;
                } else {
                    setTimeout(() => {
                        waitForHost();
                    }, 200);
                }
            }

            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id] != undefined &&
                    (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel != undefined &&
                        (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel.readyState == "open"))) {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                    connected = true;
                } else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
        });
        document.getElementById("Option").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Optionscreen").style.visibility = "visible";

            document.getElementById("BackOption").addEventListener("click", () => {
                document.getElementById("Creditscreen").style.visibility = "hidden";
                document.getElementById("Optionscreen").style.visibility = "hidden";
                document.getElementById("Startscreen").style.visibility = "visible";
            });
        });
        document.getElementById("Credits").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Creditscreen").style.visibility = "visible";

            document.getElementById("BackCredit").addEventListener("click", () => {
                document.getElementById("Creditscreen").style.visibility = "hidden";
                document.getElementById("Optionscreen").style.visibility = "hidden";
                document.getElementById("Startscreen").style.visibility = "visible";
            });
        });
    }

    function playerChoice(_e: Event) {
        if ((<HTMLButtonElement>_e.target).id == "Ranged") {
            avatar1 = new Player.Ranged(Entity.ID.RANGED, new Entity.Attributes(10000, 5, 5, 1, 2, 5));
        }
        if ((<HTMLButtonElement>_e.target).id == "Melee") {
            avatar1 = new Player.Melee(Entity.ID.MELEE, new Entity.Attributes(10000, 1, 5, 1, 2, 10));
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

        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        internalItemJSON = (<Items.InternalItem[]>loadItem.internalItems);
        buffItemJSON = (<Items.BuffItem[]>loadItem.buffItems);


        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        bulletsJSON = (<Bullets.Bullet[]>loadBullets.standardBullets);

    }

    export async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/map01.png");

        await Bullets.bulletTxt.load("./Resources/Image/Projectiles/arrow.png");
        await Bullets.waterBallTxt.load("./Resources/Image/Projectiles/waterBall.png")

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
        await Entity.txtShadow.load("./Resources/Image/Particles/shadow.png");



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



        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
        await Items.txtToxicRelationship.load("./Resources/Image/Items/toxicRelationship.png");


        AnimationGeneration.generateAnimationObjects();
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
        miniMap.mtxLocal.translation = new ƒ.Vector3(cmpCamera.mtxPivot.translation.x + miniMap.offsetX, cmpCamera.mtxPivot.translation.y + miniMap.offsetY, 0);
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    //#endregion "essential"

}
