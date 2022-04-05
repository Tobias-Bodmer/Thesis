//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"

namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;

    //#region "DomElements"
    export let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("Canvas");
    window.addEventListener("load", init);
    //#endregion "DomElements"

    //#region "PublicVariables"
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let graph: ƒ.Node = new ƒ.Node("Graph");
    export let player: Player.Player;
    export let player2: Player.Player;
    export let connected: boolean = false;
    export let frameRate: number = 60;
    export let enemies: Enemy.Enemy[] = [];
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
        player = new Player.Player("Player1", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        // ƒ.Debug.log(player);

        //#region init Items
        item1 = new Items.Item("Item1", "", new ƒ.Vector3(0, 5, 0), "./Resources/Image/Items");
        //#endregion

        Generation.generateRooms();

        //#region Testing objects
        bat = new Enemy.Enemy("Enemy", new Player.Character("bat", new Player.Attributes(10, 5, Math.random() * 3 + 1)), new ƒ.Vector2(0, 1));
        console.table(JSON.stringify(bat.properties));


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

        // graph.addChild(node);
        // for (let i = 0; i < 3; i++) {
        //     graph.addChild(new Enemy.Enemy("Enemy", new Player.Character("bat", new Player.Attributes(10, 5, Math.random() * 3 + 1)), new ƒ.Vector2(i * 0.3, 5)));
        // }
        //#endregion


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

    function waitOnConnection() {
        if (Networking.client != undefined && Networking.client.id != null || undefined) {
            document.getElementById("ConnectionGUI").style.visibility = "hidden";
            init();
        } else {
            setTimeout(waitOnConnection, 300);
        }
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
            Networking.updatePosition(Game.player.mtxLocal.translation, Game.player.mtxLocal.rotation);
        }
        // Networking.spawnEnemy(bat, bat.id);

        //#region count items
        let items: Items.Item[] = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).tag == Tag.Tag.ITEM)
        items.forEach(element => {
            element.lifespan(graph);
        });
        //#endregion

        let bullets: Items.Bullet[] = <Items.Bullet[]>graph.getChildren().filter(element => (<Items.Bullet>element).tag == Tag.Tag.BULLET)
        bullets.forEach(element => {
            element.move();
            element.lifespan(graph);
        })
        enemies = <Enemy.Enemy[]>graph.getChildren().filter(element => (<Enemy.Enemy>element).tag == Tag.Tag.ENEMY)
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            enemies.forEach(element => {
                element.move();
                element.lifespan(graph);
            })
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
