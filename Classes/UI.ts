namespace UI {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player1");
    let player2UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player2");

    export function updateUI() {
        //Player1 UI
        (<HTMLDivElement>player1UI.querySelector("#HP")).style.width = (Game.player.properties.attributes.healthPoints / Game.player.properties.attributes.maxHealthPoints * 100) + "%";

        //TODO: Needs testing
        //InventoryUI
        Game.player.items.forEach((element) => {
            let exsist: boolean = false;

            //search DOMImg for Item
            player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                if (imgElement.src == element.imgSrc) {
                    exsist = true;
                }
            });

            //none exsisting DOMImg for Item
            if (!exsist) {
                let newItem: HTMLImageElement = document.createElement("img");
                newItem.src = element.imgSrc;
                player1UI.querySelector("#Inventory").appendChild(newItem);
            }
        });

        //Player2 UI
        if (Game.connected) {
            (<HTMLDivElement>player2UI.querySelector("#HP")).style.width = (Game.player2.properties.attributes.healthPoints / Game.player2.properties.attributes.maxHealthPoints * 100) + "%";

            //InventoryUI
            Game.player2.items.forEach((element) => {
                let exsist: boolean = false;

                //search DOMImg for Item
                player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                    if (imgElement.src == element.imgSrc) {
                        exsist = true;
                    }
                });

                //none exsisting DOMImg for Item
                if (!exsist) {
                    let newItem: HTMLImageElement = document.createElement("img");
                    newItem.src = element.imgSrc;
                    player2UI.querySelector("#Inventory").appendChild(newItem);
                }
            });
        }
    }

    export let txtZero: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtOne: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtTow: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtThree: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtFour: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtFive: ƒ.TextureImage = new ƒ.TextureImage();

    export class DamageUI extends ƒ.Node {
        public tag: Tag.Tag = Tag.Tag.DAMAGEUI;

        lifetime: number = 0.5 * Game.frameRate;

        async lifespan(_graph: ƒ.Node) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
                }
            }
        }

        constructor(_position: ƒ.Vector3, _damage: number) {
            super("damageUI");
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.33, 0.33, 0.33));
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.25);

            let mesh: ƒ.MeshQuad = new ƒ.MeshQuad();
            let cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            this.loadTexture(_damage);
        }

        loadTexture(_texture: number) {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

            oldComCoat = this.getComponent(ƒ.ComponentMaterial);

            switch (_texture) {
                case 0:
                    newTxt = txtZero;
                    break;
                case 1:
                    newTxt = txtOne;
                    break;
                case 2:
                    newTxt = txtTow;
                    break;
                case 3:
                    newTxt = txtThree;
                    break;
                case 4:
                    newTxt = txtFour;
                    break;
                case 5:
                    newTxt = txtFive;
                    break;
                case 6:
                    newTxt = txtOne;
                    break;
                default:
                    break;
            }

            newCoat.color = ƒ.Color.CSS("WHITE");
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }

        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(0, 0.1, 0));
            // this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.1,0.1,0.1));
        }
    }
}