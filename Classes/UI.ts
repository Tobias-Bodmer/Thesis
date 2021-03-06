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

    export let txtZero: ??.TextureImage = new ??.TextureImage();
    export let txtOne: ??.TextureImage = new ??.TextureImage();
    export let txtTow: ??.TextureImage = new ??.TextureImage();
    export let txtThree: ??.TextureImage = new ??.TextureImage();
    export let txtFour: ??.TextureImage = new ??.TextureImage();
    export let txtFive: ??.TextureImage = new ??.TextureImage();
    export let txtSix: ??.TextureImage = new ??.TextureImage();
    export let txtSeven: ??.TextureImage = new ??.TextureImage();
    export let txtEight: ??.TextureImage = new ??.TextureImage();
    export let txtNine: ??.TextureImage = new ??.TextureImage();
    export let txtTen: ??.TextureImage = new ??.TextureImage();

    export class DamageUI extends ??.Node {
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

        constructor(_position: ??.Vector3, _damage: number) {
            super("damageUI");
            this.addComponent(new ??.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ??.Vector3(0.33, 0.33, 0.33));
            this.cmpTransform.mtxLocal.translation = new ??.Vector3(_position.x, _position.y, 0.25);

            let mesh: ??.MeshQuad = new ??.MeshQuad();
            let cmpMesh: ??.ComponentMesh = new ??.ComponentMesh(mesh);
            this.addComponent(cmpMesh);

            let mtrSolidWhite: ??.Material = new ??.Material("SolidWhite", ??.ShaderLit, new ??.CoatRemissive(??.Color.CSS("white")));

            let cmpMaterial: ??.ComponentMaterial = new ??.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);

            this.loadTexture(_damage);

            this.addEventListener(Game.??.EVENT.RENDER_PREPARE, this.update);
        }

        update = (_event: Event): void => {
            this.move();
            this.lifespan();
        }

        async move() {
            this.cmpTransform.mtxLocal.translate(new ??.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(??.Vector3.ONE(1.01));
        }

        loadTexture(_damage: number) {
            let newTxt: ??.TextureImage = new ??.TextureImage();
            let newCoat: ??.CoatRemissiveTextured = new ??.CoatRemissiveTextured();
            let newMtr: ??.Material = new ??.Material("mtr", ??.ShaderLitTextured, newCoat);
            let oldComCoat: ??.ComponentMaterial = new ??.ComponentMaterial();

            oldComCoat = this.getComponent(??.ComponentMaterial);

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
                newCoat.color = ??.Color.CSS("red");
            }
            else {
                newCoat.color = ??.Color.CSS("green");
                this.up = 0.1;
            }
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
    }

    export let healParticle: ??.TextureImage = new ??.TextureImage();
    export let poisonParticle: ??.TextureImage = new ??.TextureImage();
    export let burnParticle: ??.TextureImage = new ??.TextureImage();
    export let bleedingParticle: ??.TextureImage = new ??.TextureImage();
    export let slowParticle: ??.TextureImage = new ??.TextureImage();
    export let immuneParticle: ??.TextureImage = new ??.TextureImage();
    export let furiousParticle: ??.TextureImage = new ??.TextureImage();
    export let exhaustedParticle: ??.TextureImage = new ??.TextureImage();

    export let commonParticle: ??.TextureImage = new ??.TextureImage();
    export let rareParticle: ??.TextureImage = new ??.TextureImage();
    export let epicParticle: ??.TextureImage = new ??.TextureImage();
    export let legendaryParticle: ??.TextureImage = new ??.TextureImage();

    export class Particles extends Game.??Aid.NodeSprite {
        id: Buff.BUFFID | Items.RARITY;
        animationParticles: Game.??Aid.SpriteSheetAnimation;
        particleframeNumber: number;
        particleframeRate: number;
        width: number;
        height: number;
        constructor(_id: Buff.BUFFID | Items.RARITY, _texture: Game.??.TextureImage, _frameCount: number, _frameRate: number) {
            super(Buff.BUFFID[_id].toLowerCase());
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.??Aid.SpriteSheetAnimation(Buff.BUFFID[_id].toLowerCase(), new ??.CoatTextured(??.Color.CSS("white"), _texture))
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;

            this.animationParticles.generateByGrid(??.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ??.ORIGIN2D.CENTER, ??.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.framerate = _frameRate;
            this.addComponent(new Game.??.ComponentTransform());
            this.mtxLocal.translateZ(0.001);

            this.getComponent(??.ComponentMaterial).sortForAlpha = true;
        }

    }
}