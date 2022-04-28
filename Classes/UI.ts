namespace UI {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player1");
    let player2UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player2");

    export function updateUI() {
        //Avatar1 UI
        (<HTMLDivElement>player1UI.querySelector("#HP")).style.width = (Game.avatar1.attributes.healthPoints / Game.avatar1.attributes.maxHealthPoints * 100) + "%";

        //InventoryUI
        Game.avatar1.items.forEach((element) => {
            let exsist: boolean = false;

            if (element.imgSrc == undefined) {
                exsist = true;
            } else {
                //search DOMImg for Item
                player1UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {

                    let imgName = element.imgSrc.split("/");
                    if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                        exsist = true;
                    }
                });
            }


            //none exsisting DOMImg for Item
            if (!exsist) {
                let newItem: HTMLImageElement = document.createElement("img");
                newItem.src = element.imgSrc;
                player1UI.querySelector("#Inventory").appendChild(newItem);
            }
        });

        //Avatar2 UI
        if (Game.connected) {
            (<HTMLDivElement>player2UI.querySelector("#HP")).style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";

            //InventoryUI
            Game.avatar2.items.forEach((element) => {
                let exsist: boolean = false;

                if (element.imgSrc == undefined) {
                    exsist = true;
                } else {
                    //search DOMImg for Item
                    player2UI.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                        let imgName = element.imgSrc.split("/");
                        if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                            exsist = true;
                        }
                    });
                }


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
    export let txtSix: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtSeven: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtEight: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtNine: ƒ.TextureImage = new ƒ.TextureImage();
    export let txtTen: ƒ.TextureImage = new ƒ.TextureImage();

    export class DamageUI extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.DAMAGEUI;
        up: number = 0.15;
        lifetime: number = 0.5 * 60;
        randomX: number = Math.random() * 0.05 - Math.random() * 0.05;
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

        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
        }
        loadTexture(_damage: number) {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

            oldComCoat = this.getComponent(ƒ.ComponentMaterial);

            switch (Math.abs(_damage)) {
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
                    newTxt = txtSeven;
                    break;
                case 7:
                    newTxt = txtEight;
                    break;
                case 8:
                    newTxt = txtEight;
                    break;
                case 9:
                    newTxt = txtNine;
                    break;
                case 10:
                    newTxt = txtTen;
                    break;
                default:
                    break;
            }
            if (_damage >= 0) {
                newCoat.color = ƒ.Color.CSS("red");
            }
            else {
                newCoat.color = ƒ.Color.CSS("green");
                this.up = 0.1;
            }
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
    }

    export let healParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let poisonParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let burnParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let bleedingParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let slowParticle: ƒ.TextureImage = new ƒ.TextureImage();



    export class Particles extends Game.ƒAid.NodeSprite {
        id: Buff.BUFFID;
        animationParticles: Game.ƒAid.SpriteSheetAnimation;
        particleframeNumber: number;
        particleframeRate: number;
        width: number;
        height: number;
        constructor(_id: Buff.BUFFID, _texture: Game.ƒ.TextureImage, _frameCount: number, _frameRate: number) {
            super(getNameById(_id));
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(getNameById(this.id), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture))
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;

            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);
        }

    }
    function getNameById(_id: Buff.BUFFID): string {
        switch (_id) {
            case Buff.BUFFID.BLEEDING:
                return "bleeding";
            case Buff.BUFFID.POISON:
                return "poison";
            case Buff.BUFFID.HEAL:
                return "heal";
            case Buff.BUFFID.SLOW:
                return "slow";
            default:
                return null;
        }
    }
}