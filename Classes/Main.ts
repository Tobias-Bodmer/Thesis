//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"

namespace Game {
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
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let graph: ƒ.Node = new ƒ.Node("Graph");
    export let avatar1: Player.Player;
    export let avatar2: Player.Player;
    export let connected: boolean = false;
    export let frameRate: number = 60;
    export let enemies: Enemy.Enemy[] = [];
    export let bullets: Bullets.Bullet[];
    export let enemiesJSON: Player.Character[];
    export let itemsJSON: Player.Character[];
    export let bat: Enemy.Enemy;
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let item1: Items.Item;
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    let playerType: Player.Type;
    const damper: number = 3.5;
    //#endregion "PrivateVariables"



    //#region "essential"
    async function init() {
        if (Bullets.bulletTxt == null) {
            loadTextures();
        }
        await loadEnemiesJSON();

        if (avatar1 == null) {
            avatar1 = new Player.Ranged("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        }

        //#region init Items
        item1 = new Items.InternalItem("cooldown reduction", "adds speed and shit", new ƒ.Vector3(0, 2, 0), new Player.Attributes(0, 0, 0, 100), Items.ITEMTYPE.PROCENTUAL, "./Resources/Image/Items");
        //#endregion

        Generation.generateRooms();

        // let enemy = new Enemy.EnemyCircle("sörkler", new Player.Character("sörki", new Player.Attributes(10, 2, 3)), new ƒ.Vector2(2, 3));
        // graph.addChild(enemy);
        //#region Testing objects


        graph.appendChild(avatar1);
        graph.appendChild(item1);


        ƒAid.addStandardLightComponents(graph);

        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);


        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();

        ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, frameRate);
    }

    function update(): void {
        InputSystem.move();

        if (avatar2 != undefined && !connected) {
            connected = true;
        }


        draw();

        cameraUpdate();

        avatar1.cooldown();

        if (Game.connected) {
            avatar2.cooldown();
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
        }
        // Networking.spawnEnemy(bat, bat.id);

        //#region count items
        let items: Items.Item[] = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).tag == Tag.Tag.ITEM)
        items.forEach(element => {
            element.lifespan(graph);
            (<Items.InternalItem>element).collisionDetection();
        });
        //#endregion

        bullets = <Bullets.Bullet[]>graph.getChildren().filter(element => (<Bullets.Bullet>element).tag == Tag.Tag.BULLET)
        if (Game.connected) {
            bullets.forEach(element => {
                element.move();
                element.lifespan(graph);
            })
        }

        let damageUI: UI.DamageUI[] = <UI.DamageUI[]>graph.getChildren().filter(element => (<UI.DamageUI>element).tag == Tag.Tag.DAMAGEUI)
        damageUI.forEach(element => {
            element.move();
            element.lifespan(graph);
        })

        enemies = <Enemy.Enemy[]>graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.Tag.ENEMY)
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            enemies.forEach(element => {
                element.move();
                element.lifespan(graph);
            })

            EnemySpawner.spawnEnemies();
        }
        UI.updateUI();
    }

    function start() {
        loadTextures();
        //add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            Networking.conneting();
            document.getElementById("Startscreen").style.visibility = "hidden";
            document.getElementById("Lobbyscreen").style.visibility = "visible";
            waitOnConnection();
        });
        document.getElementById("Option").addEventListener("click", () => {

        });
        document.getElementById("Credits").addEventListener("click", () => {

        });
    }
    async function loadEnemiesJSON() {
        const load = await (await fetch("./Resources/EnemiesStorage.json")).json();
        enemiesJSON = ((<Player.Character[]>load.enemies));
    }

    async function loadTextures() {
        await Bullets.bulletTxt.load("./Resources/Image/arrow.png");

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
    }



    async function waitOnConnection() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } })
        if (Networking.clients.length > 1 && avatar1 != null) {
            await init();
            Networking.spawnPlayer(playerType);
        } else {
            setTimeout(waitOnConnection, 300);
        }
    }

    function playerChoice(_e: Event) {
        if ((<HTMLButtonElement>_e.target).id == "Ranged") {
            avatar1 = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
            playerType = Player.Type.RANGED;
        }
        if ((<HTMLButtonElement>_e.target).id == "Melee") {
            avatar1 = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5)));
            playerType = Player.Type.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
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
