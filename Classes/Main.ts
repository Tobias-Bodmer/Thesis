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
    export let player: Player.Player;
    export let player2: Player.Player;
    export let connected: boolean = false;
    export let frameRate: number = 60;
    export let enemies: Enemy.Enemy[] = [];
    export let enemiesJSON: Player.Character[];
    export let bat: Enemy.Enemy;
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let item1: Items.Item;
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    const damper: number = 3.5;
    //#endregion "PrivateVariables"

    //#region enemies
    //#endregion

    //#region "essential"
    async function init() {
        if (Bullets.bulletTxt == null) {
            loadTextures();
        }
        await loadEnemiesJSON();

        if (player == null) {
            player = new Player.Ranged("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        }
        // ƒ.Debug.log(player);

        //#region init Items
        item1 = new Items.InternalItem("speedUP", "adds speed and shit", new ƒ.Vector3(0, 2, 0), new Player.Attributes(0, 0, 1), Items.ITEMTYPE.ADD, "./Resources/Image/Items");
        //#endregion

        Generation.generateRooms();

        //#region Testing objects
        let node: ƒ.Node = new ƒ.Node("Quad");

        node.addComponent(new ƒ.ComponentTransform());

        let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
        let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
        node.addComponent(cmpMesh);

        let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
        node.addComponent(cmpMaterial);

        let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
        let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
        let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();
        let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
        let oldPivot: ƒ.Matrix4x4 = new ƒ.Matrix4x4();

        oldComCoat = node.getComponent(ƒ.ComponentMaterial);
        oldPivot = node.getComponent(ƒ.ComponentMesh).mtxPivot;

        await newTxt.load("./Resources/Image/gras.png");
        newCoat.color = ƒ.Color.CSS("WHITE");
        newCoat.texture = newTxt;
        oldComCoat.material = newMtr;

        node.cmpTransform.mtxLocal.scale(new ƒ.Vector3(30, 30, 1));
        node.cmpTransform.mtxLocal.translateZ(-0.01);


        graph.appendChild(player);
        graph.appendChild(item1);


        ƒAid.addStandardLightComponents(graph);

        cmpCamera.mtxPivot.translateZ(25);
        cmpCamera.mtxPivot.rotateY(180);

        ƒ.Debug.log(graph);

        viewport.initialize("Viewport", graph, cmpCamera, canvas);

        draw();

        ƒ.Loop.start(ƒ.LOOP_MODE.TIME_GAME, frameRate);
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

    let playerType: Player.Type;
    async function waitOnConnection() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } })
        if (Networking.clients.length > 1 && player != null) {
            await init();
            Networking.spawnPlayer(playerType);
        } else {
            setTimeout(waitOnConnection, 300);
        }
    }

    function playerChoice(_e: Event) {
        if ((<HTMLButtonElement>_e.target).id == "Ranged") {
            player = new Player.Ranged("player", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
            playerType = Player.Type.RANGED;
        }
        if ((<HTMLButtonElement>_e.target).id == "Melee") {
            player = new Player.Melee("player", new Player.Character("Thor,", new Player.Attributes(10, 1, 5)));
            playerType = Player.Type.MELEE;
        }
        document.getElementById("Lobbyscreen").style.visibility = "hidden";
    }

    function draw(): void {
        viewport.draw();
    }

    function update(): void {
        InputSystem.move();

        if (player2 != undefined && !connected) {
            connected = true;
        }

        draw();

        cameraUpdate();

        player.cooldown();

        if (Game.connected) {
            player2.cooldown();
        }

        if (Game.connected) {
            Networking.updatePosition(Game.player.mtxLocal.translation, Game.player.mtxLocal.rotation);
        }
        // Networking.spawnEnemy(bat, bat.id);

        //#region count items
        let items: Items.Item[] = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).tag == Tag.Tag.ITEM)
        items.forEach(element => {
            element.lifespan(graph);
            (<Items.InternalItem>element).collisionDetection();
        });
        //#endregion

        let bullets: Bullets.Bullet[] = <Bullets.Bullet[]>graph.getChildren().filter(element => (<Bullets.Bullet>element).tag == Tag.Tag.BULLET)
        bullets.forEach(element => {
            element.move();
            element.lifespan(graph);
        })

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

    export function cameraUpdate() {
        let direction = ƒ.Vector2.DIFFERENCE(player.cmpTransform.mtxLocal.translation.toVector2(), cmpCamera.mtxPivot.translation.toVector2());
        direction.scale(1 / frameRate * damper);
        cmpCamera.mtxPivot.translate(new ƒ.Vector3(-direction.x, direction.y, 0), true);
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    //#endregion "essential"

}
