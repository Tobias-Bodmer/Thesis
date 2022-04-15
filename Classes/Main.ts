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
    export let graph: ƒ.Node = new ƒ.Node("Graph");
    export let avatar1: Player.Player;
    export let avatar2: Player.Player;
    export let connected: boolean = false;
    export let frameRate: number = 60;
    export let enemies: Enemy.Enemy[] = [];
    export let bullets: Bullets.Bullet[];
    export let items: Items.Item[] = [];
    export let enemiesJSON: Entity.Entity[];
    export let itemsJSON: Items.Item[];
    export let internalItemStatsJSON: Items.InternalItem[];
    export let bulletsJSON: Bullets.Bullet[];
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let item1: Items.Item;
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    let playerType: Player.PLAYERTYPE;
    const damper: number = 3.5;
    //#endregion "PrivateVariables"



    //#region "essential"
    async function init() {

        if (Networking.client.id == Networking.client.idHost) {
            Generation.generateRooms();
        }

        graph.appendChild(avatar1);

        ƒAid.addStandardLightComponents(graph);

        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();

        helper();

        function helper() {
            if (avatar2 != undefined) {
                ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, frameRate);
            } else {
                setTimeout(() => {
                    helper();
                }, 100);
            }
        }
    }

    function update(): void {

        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            InputSystem.move();
        }

        draw();

        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            cameraUpdate();

            avatar1.cooldown();

            if (Game.connected) {
                avatar2.cooldown();
                Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            }

            //#region count items
            items = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).tag == Tag.TAG.ITEM)
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                items.forEach(element => {
                    // element.despawn();
                    // (<Items.InternalItem>element).collisionDetection();
                });
            }
            //#endregion

            bullets = <Bullets.Bullet[]>graph.getChildren().filter(element => (<Bullets.Bullet>element).tag == Tag.TAG.BULLET)
            if (Game.connected) {
                bullets.forEach(element => {
                    element.update();
                })
            }

            let damageUI: UI.DamageUI[] = <UI.DamageUI[]>graph.getChildren().filter(element => (<UI.DamageUI>element).tag == Tag.TAG.DAMAGEUI)
            damageUI.forEach(element => {
                element.move();
                element.lifespan(graph);
            })

            enemies = <Enemy.Enemy[]>graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.TAG.ENEMY)
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                enemies.forEach(element => {
                    element.update();
                    if (element instanceof Enemy.EnemyShoot) {
                        (<Enemy.EnemyShoot>element).weapon.cooldown(element.attributes.coolDownReduction);
                    }
                })

                EnemySpawner.spawnEnemies();
            }

            UI.updateUI();
        }
    }

    function start() {
        loadTextures();
        loadJSON();

        //add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            Networking.conneting();
            document.getElementById("Startscreen").style.visibility = "hidden";

            waitOnConnection();

            waitForHost();

            waitForLobby();

            function waitForLobby() {
                if (Networking.clients.length >= 2 && Networking.client.idHost != undefined && (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel != undefined &&
                    (Networking.client.peers[Networking.clients.find(elem => elem.id != Networking.client.id).id].dataChannel.readyState == "open"))) {
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                    connected = true;
                } else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }

            function waitForHost() {
                if (Networking.clients.length >= 2 && Networking.client.idHost == undefined) {
                    Networking.setHost();
                } else {
                    setTimeout(() => {
                        waitForHost();
                    }, 200);
                }
            }
        });
        document.getElementById("Option").addEventListener("click", () => {

        });
        document.getElementById("Credits").addEventListener("click", () => {

        });
    }

    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        enemiesJSON = (<Entity.Entity[]>loadEnemy.enemies);

        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        itemsJSON = (<Items.Item[]>loadItem.items);
        internalItemStatsJSON = (<Items.InternalItem[]>loadItem.internalStats);

        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        bulletsJSON = (<Bullets.Bullet[]>loadBullets.standardBullets);

    }

    async function loadTextures() {
        await Bullets.bulletTxt.load("./Resources/Image/arrow01.png");

        //UI
        await UI.txtZero.load("./Resources/Image/0.png");
        await UI.txtOne.load("./Resources/Image/1.png");
        await UI.txtTow.load("./Resources/Image/2.png");
        await UI.txtThree.load("./Resources/Image/3.png");
        await UI.txtFour.load("./Resources/Image/4.png");
        await UI.txtFive.load("./Resources/Image/5.png");
        await UI.txtSix.load("./Resources/Image/6.png");
        await UI.txtSeven.load("./Resources/Image/7.png");
        await UI.txtEight.load("./Resources/Image/8.png");
        await UI.txtNine.load("./Resources/Image/9.png");
        await UI.txtTen.load("./Resources/Image/10.png");

        //ENEMY
        await AnimationGeneration.txtBatIdle.load("./Resources/Image/Enemies/bat/batIdle.png");

        await AnimationGeneration.txtRedTickIdle.load("./Resources/Image/Enemies/tick/redTickIdle.png");
        await AnimationGeneration.txtRedTickWalk.load("./Resources/Image/Enemies/tick/redTickWalk.png")

        AnimationGeneration.createAllAnimations();

    }

    async function waitOnConnection() {
        Networking.setClient();
        if (Networking.clients.filter(elem => elem.ready == true).length >= 2 && Networking.client.idHost != undefined) {
            if (Networking.client.id == Networking.client.idHost) {
                document.getElementById("IMHOST").style.visibility = "visible";
            }

            await init();
            gamestate = GAMESTATES.PLAYING;
            await Networking.spawnPlayer(playerType);


            //#region init Items
            if (Networking.client.id == Networking.client.idHost) {
                item1 = new Items.CooldDownDown(Items.ITEMID.COOLDOWN, new ƒ.Vector2(0, 2), null);
                let item2 = new Items.CooldDownDown(Items.ITEMID.COOLDOWN, new ƒ.Vector2(0, -2), null);
                graph.appendChild(item1);
                graph.appendChild(item2);
            }
            //#endregion
        } else {
            setTimeout(waitOnConnection, 300);
        }
    }

    function playerChoice(_e: Event) {
        if ((<HTMLButtonElement>_e.target).id == "Ranged") {
            avatar1 = new Player.Ranged(Entity.ID.PLAYER1, new Entity.Attributes(10, 5, 5, 1, 2));
            playerType = Player.PLAYERTYPE.RANGED;
        }
        if ((<HTMLButtonElement>_e.target).id == "Melee") {
            avatar1 = new Player.Melee(Entity.ID.PLAYER1, new Entity.Attributes(10, 1, 5, 1, 2));
            playerType = Player.PLAYERTYPE.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";

        readySate();

        function readySate() {
            if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
                Networking.setClientReady();
            }
            if (Networking.clients.filter(elem => elem.ready == true).length < 2) {
                setTimeout(() => { readySate() }, 200);
            }
        }
    }

    function draw(): void {
        viewport.draw();
    }

    export function cameraUpdate() {
        let direction = ƒ.Vector2.DIFFERENCE(avatar1.cmpTransform.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        direction.scale(1 / frameRate * damper);
        cmpCamera.mtxPivot.translate(new ƒ.Vector3(-direction.x, direction.y, 0), true);
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    //#endregion "essential"

}
