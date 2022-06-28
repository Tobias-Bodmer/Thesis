namespace UI {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player1");
    let player2UI: HTMLDivElement = <HTMLDivElement>document.getElementById("Player2");
    let bossUI: HTMLDivElement = <HTMLDivElement>document.getElementById("Boss");

    export function updateUI() {
        //Avatar1 UI
        (<HTMLDivElement>player1UI.querySelector("#HP")).style.width = (Game.avatar1.attributes.healthPoints / Game.avatar1.attributes.maxHealthPoints * 100) + "%";

        //InventoryUI
        updateInvUI(Game.avatar1.items, player1UI);

        //Door-PopUp
        doorPopUp();

        //Avatar2 UI
        (<HTMLDivElement>player2UI.querySelector("#HP")).style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";

        //InventoryUI
        updateInvUI(Game.avatar2.items, player2UI);

        //BossUI
        if (Game.currentRoom != undefined && Game.currentRoom.roomType == Generation.ROOMTYPE.BOSS && (<Generation.BossRoom>Game.currentRoom).boss != undefined && (<Generation.BossRoom>Game.currentRoom).boss.attributes.healthPoints > 0) {
            let boss: Enemy.Enemy = (<Generation.BossRoom>Game.currentRoom).boss;
            bossUI.style.visibility = "visible";
            (<HTMLDivElement>bossUI.querySelector("#Name")).innerHTML = boss.name;
            (<HTMLDivElement>bossUI.querySelector("#HP")).style.width = (boss.attributes.healthPoints / boss.attributes.maxHealthPoints * 100) + "%";
        } else {
            bossUI.style.visibility = "hidden";
        }

        //ItemPopUp
        if (itemUICooldown.hasCooldown) {
            fade(itemUI, true);
        } else {
            fade(itemUI, false);
            if (+getComputedStyle(itemUI).opacity <= 0) {
                setTimeout(() => {
                    if (itemPopUps.length > 0) {
                        addItemPopUpContent();
                    }
                }, 200);
            }
        }

        function updateInvUI(_inv: Items.Item[], _ui: HTMLElement) {
            _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                let remove = true;
                _inv.forEach((element) => {
                    let imgName = element.imgSrc.split("/");
                    if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                        remove = false;
                    }
                });
                if (remove) {
                    imgElement.parentElement.remove();
                }
            });

            _inv.forEach((element) => {
                if (element != undefined) {
                    let exsist: boolean = false;

                    if (element.imgSrc == undefined) {
                        exsist = true;
                    } else {
                        //search DOMImg for Item
                        _ui.querySelector("#Inventory").querySelectorAll("img").forEach((imgElement) => {
                            let imgName = element.imgSrc.split("/");
                            if (imgElement.src.split("/").find(elem => elem == imgName[imgName.length - 1]) != null) {
                                exsist = true;
                            }
                        });
                    }


                    //none exsisting DOMImg for Item
                    if (!exsist) {
                        let newDiv: HTMLDivElement = document.createElement("div");
                        newDiv.className = "tooltip";

                        let newItem: HTMLImageElement = document.createElement("img");
                        newItem.src = element.imgSrc;
                        newDiv.appendChild(newItem);

                        let newTooltip: HTMLSpanElement = document.createElement("span");
                        newTooltip.textContent = element.description;
                        newTooltip.className = "tooltiptext";
                        newDiv.appendChild(newTooltip);

                        let newTooltipLabel: HTMLParagraphElement = document.createElement("p");
                        newTooltipLabel.textContent = element.name;
                        newTooltip.insertAdjacentElement("afterbegin", newTooltipLabel);

                        _ui.querySelector("#Inventory").appendChild(newDiv);
                    }
                }
            });
        }

        function doorPopUp() {
            let doorIsNear: boolean = false;    
            
            Game.currentRoom.walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (wall.door.collider != undefined && Game.avatar1.collider.collidesRect(wall.door.collider)) {
                        doorIsNear = true;
                    }
                }
            });
            if (Game.currentRoom.exitDoor != undefined) {
                if (Game.currentRoom.exitDoor.collider != undefined && Game.avatar1.collider.collidesRect(Game.currentRoom.exitDoor.collider)) {
                    doorIsNear = true;
                }
            }

            if (doorIsNear) {
                document.getElementById("Door-PopUp").style.visibility = "visible";
            } else {
                document.getElementById("Door-PopUp").style.visibility = "hidden";
            }
        }
    }

    let itemUI: HTMLDivElement = <HTMLDivElement>document.getElementById("Item-PopUp");
    let itemUICooldown: Ability.Cooldown = new Ability.Cooldown(120);
    let itemPopUps: Array<{ name: string, description: string }> = [];
    export function itemPopUp(_item: Items.Item) {
        itemPopUps.push({ name: _item.name, description: _item.description });

        if (itemUI.style.visibility == "hidden") {
            addItemPopUpContent();
        }
    }

    function addItemPopUpContent() {
        itemUI.querySelector("#Name").innerHTML = itemPopUps[0].name;
        itemUI.querySelector("#Description").innerHTML = itemPopUps[0].description;

        itemPopUps.splice(0, 1);

        itemUICooldown.startCooldown();
    }

    function fade(_element: HTMLElement, _in: boolean) {
        if (_element) {
            if (_in) {
                if (+_element.style.opacity <= 0) {
                    _element.style.visibility = "visible";
                }
                _element.style.opacity = (+_element.style.opacity + 0.1).toString();
            } else {
                if (+_element.style.opacity <= 0) {
                    _element.style.visibility = "hidden";
                    return;
                }
                _element.style.opacity = (+_element.style.opacity - 0.1).toString();
            }
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
        public tag: Tag.TAG = Tag.TAG.UI;
        up: number = 0.15;
        lifetime: number = 0.5 * 60;
        randomX: number = Math.random() * 0.05 - Math.random() * 0.05;
        async lifespan() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
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

            let mtrSolidWhite: ƒ.Material = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));

            let cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            this.loadTexture(_damage);

            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.update);
        }

        update = (_event: Event): void => {
            this.move();
            this.lifespan();
        }

        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
        }

        loadTexture(_damage: number) {
            let newTxt: ƒ.TextureImage = new ƒ.TextureImage();
            let newCoat: ƒ.CoatRemissiveTextured = new ƒ.CoatRemissiveTextured();
            let newMtr: ƒ.Material = new ƒ.Material("mtr", ƒ.ShaderLitTextured, newCoat);
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
                    newTxt = txtTen;
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
    export let immuneParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let furiousParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let exhaustedParticle: ƒ.TextureImage = new ƒ.TextureImage();

    export let commonParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let rareParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let epicParticle: ƒ.TextureImage = new ƒ.TextureImage();
    export let legendaryParticle: ƒ.TextureImage = new ƒ.TextureImage();

    export class Particles extends Game.ƒAid.NodeSprite {
        id: Buff.BUFFID | Items.RARITY;
        animationParticles: Game.ƒAid.SpriteSheetAnimation;
        particleframeNumber: number;
        particleframeRate: number;
        width: number;
        height: number;
        constructor(_id: Buff.BUFFID | Items.RARITY, _texture: Game.ƒ.TextureImage, _frameCount: number, _frameRate: number) {
            super(Buff.BUFFID[_id].toLowerCase());
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(Buff.BUFFID[_id].toLowerCase(), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture))
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;

            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.framerate = _frameRate;
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);

            this.getComponent(ƒ.ComponentMaterial).sortForAlpha = true;
        }

    }
}