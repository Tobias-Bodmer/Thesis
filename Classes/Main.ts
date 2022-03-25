//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"

namespace Game {
    export import ƒ = FudgeCore;
    export import ƒAid = FudgeAid;

    //#region "DomElements"
    export let canvas: HTMLCanvasElement = <HTMLCanvasElement>document.getElementById("Canvas");
    let crc2: CanvasRenderingContext2D = canvas.getContext("2d");
    window.addEventListener("load", init);
    canvas.addEventListener("mouseover", doSmth);
    //#endregion "DomElements"

    //#region "PublicVariables"
    export let viewport: ƒ.Viewport = new ƒ.Viewport();
    export let graph: ƒ.Node = new ƒ.Node("Graph");
    export let player: Player.Player;
    export let player2: Player.Player;
    export let connected: boolean = false;
    //#endregion "PublicVariables"

    //#region "PrivateVariables"
    let item1: Items.Item;
    let cmpCamera: ƒ.ComponentCamera = new ƒ.ComponentCamera();
    let frameRate: number = 60;
    //#endregion "PrivateVariables"

    function doSmth(_mouseEvent: MouseEvent) {
        // let pointer: ƒ.Vector2 = new ƒ.Vector2(_mouseEvent.pageX, _mouseEvent.pageY);
        // let ray: ƒ.Ray = viewport.getRayFromClient(pointer);
        // let hit: ƒ.RayHitInfo = ƒ.Physics.raycast(ray.origin, ray.direction);
        // console.log(hit.hitPoint);
        // let player3 = new Player.Player("Player3,", "12", new Player.Character("Thohor", new Player.Attributes(10, 5, 5)));
        // graph.appendChild(player3);
        // player3.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 2, 0);
        // Game.ƒ.RayHitInfo.length
        // let pickData: Pick[] = ƒ.Picker.pickViewport(viewport, new ƒ.Vector2(_mouseEvent.clientX, _mouseEvent.clientY));
        // console.log(pickData);
        // ƒ.Ray
    }

    //#region "essential"
    async function init() {
        player = new Player.Player("Player1", "11", new Player.Character("Thor,", new Player.Attributes(10, 5, 5)));
        player.addComponent(cmpCamera);
        ƒ.Debug.log(player);

        //#region init Items
        item1 = new Items.Item("Item1", "", new ƒ.Vector3(0, 5, 0));
        //#endregion

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

        node.cmpTransform.mtxLocal.scale(new ƒ.Vector3(50, 50, 1));
        node.cmpTransform.mtxLocal.translateZ(-0.01);

        graph.addChild(node);

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
        draw();
        //#region count items
        let items: Items.Item[] = <Items.Item[]>graph.getChildren().filter(element => (<Items.Item>element).lifetime != null)
        items.forEach(element => {
            element.lifespan(graph);
        });
        //#endregion

 
    }

    ƒ.Loop.addEventListener(ƒ.EVENT.LOOP_FRAME, update);
    //#endregion "essential"

}
