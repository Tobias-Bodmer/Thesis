"use strict";
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
var Game;
//#region "Imports"
///<reference types="../FUDGE/Core/Build/FudgeCore.js"/>
///<reference types="../FUDGE/Aid/Build/FudgeAid.js"/>
//#endregion "Imports"
(function (Game) {
    let GAMESTATES;
    (function (GAMESTATES) {
        GAMESTATES[GAMESTATES["PLAYING"] = 0] = "PLAYING";
        GAMESTATES[GAMESTATES["PAUSE"] = 1] = "PAUSE";
    })(GAMESTATES = Game.GAMESTATES || (Game.GAMESTATES = {}));
    Game.ƒ = FudgeCore;
    Game.ƒAid = FudgeAid;
    //#region "DomElements"
    Game.canvas = document.getElementById("Canvas");
    // window.addEventListener("load", init);
    window.addEventListener("load", start);
    document.getElementById("Ranged").addEventListener("click", playerChoice);
    document.getElementById("Melee").addEventListener("click", playerChoice);
    //#endregion "DomElements"
    //#region "PublicVariables"
    Game.gamestate = GAMESTATES.PAUSE;
    Game.viewport = new Game.ƒ.Viewport();
    Game.cmpCamera = new Game.ƒ.ComponentCamera();
    Game.graph = new Game.ƒ.Node("Graph");
    Game.connected = false;
    Game.entities = [];
    Game.enemies = [];
    Game.bullets = [];
    Game.items = [];
    Game.coolDowns = [];
    Game.loaded = false;
    //#endregion "PublicVariables"
    //#region "PrivateVariables"
    const damper = 3.5;
    //#endregion "PrivateVariables"
    //#region "essential"
    async function init() {
        if (Networking.client.id == Networking.client.idHost) {
            Generation.generateRooms();
            Game.serverPredictionAvatar = new Networking.ServerPrediction(null);
        }
        Game.graph.appendChild(Game.avatar1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
        Game.cmpCamera.mtxPivot.translation = Game.ƒ.Vector3.ZERO();
        Game.cmpCamera.mtxPivot.translateZ(25);
        Game.cmpCamera.mtxPivot.rotateY(180);
        Game.viewport.initialize("Viewport", Game.graph, Game.cmpCamera, Game.canvas);
    }
    function update() {
        Game.deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        cameraUpdate();
        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            Game.serverPredictionAvatar.update();
        }
        Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
        // coolDowns.forEach(_cd => {
        //     _cd.updateCoolDown();
        // })
        Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
        if (Game.connected) {
            Game.bullets.forEach(element => {
                element.predict();
            });
        }
        // let damageUI: UI.DamageUI[] = <UI.DamageUI[]>graph.getChildren().filter(element => (<UI.DamageUI>element).tag == Tag.TAG.DAMAGEUI)
        // damageUI.forEach(element => {
        //     element.move();
        //     element.lifespan(graph);
        // })
        Game.entities = Game.graph.getChildren().filter(child => child instanceof Entity.Entity);
        // entities.forEach(element => {
        //     element.updateBuffs();
        //     if (Game.connected && Networking.client.idHost == Networking.client.id) {
        //         element.update();
        //     }
        // })
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
        Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
        UI.updateUI();
        draw();
    }
    function setClient() {
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
            Networking.setClient();
            return;
        }
        else {
            setTimeout(() => { setClient(); }, 100);
        }
    }
    function readySate() {
        if (Networking.clients.length >= 2 && Networking.client.idHost != undefined) {
            Networking.setClientReady();
        }
        else {
            setTimeout(() => { readySate(); }, 100);
        }
    }
    function startLoop() {
        if (Networking.client.id != Networking.client.idHost && Game.avatar2 != undefined) {
            Networking.loaded();
        }
        if (Game.loaded) {
            Game.ƒ.Loop.start(Game.ƒ.LOOP_MODE.TIME_GAME, Game.deltaTime);
        }
        else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }
    function start() {
        loadTextures();
        loadJSON();
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
                    await init();
                    Game.gamestate = GAMESTATES.PLAYING;
                    // EnemySpawner.spawnEnemies();
                    // if (Networking.client.id == Networking.client.idHost) {
                    //     EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new ƒ.Vector2(3, 3), null);
                    // }
                    //#region init Items
                    if (Networking.client.id == Networking.client.idHost) {
                        // item1 = new Items.BuffItem(Items.ITEMID.TOXICRELATIONSHIP, new ƒ.Vector2(0, 2), null);
                        let item2 = new Items.InternalItem(Items.ITEMID.PROJECTILESUP, new Game.ƒ.Vector2(0, -2), null);
                        let item3 = new Items.InternalItem(Items.ITEMID.HOMECOMING, new Game.ƒ.Vector2(-2, 0), null);
                        // graph.appendChild(item1);
                        Game.graph.appendChild(item2);
                        Game.graph.appendChild(item3);
                    }
                    Networking.spawnPlayer();
                    //#endregion
                    startLoop();
                }
                else {
                    setTimeout(waitOnConnection, 300);
                }
            }
            document.getElementById("Host").addEventListener("click", Networking.setHost);
            waitForHost();
            function waitForHost() {
                if (Networking.clients.length >= 2) {
                    document.getElementById("Hostscreen").style.visibility = "visible";
                    return;
                }
                else {
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
                    Game.connected = true;
                }
                else {
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
    function playerChoice(_e) {
        if (_e.target.id == "Ranged") {
            Game.avatar1 = new Player.Ranged(Entity.ID.RANGED, new Entity.Attributes(10000, 5, 5, 1, 2, 5));
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee(Entity.ID.MELEE, new Entity.Attributes(10000, 1, 5, 1, 2, 10));
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
        }
        else {
            playing(true, false);
        }
    }
    function pause(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PLAYING) {
            if (_sync) {
                Networking.setGamestate(false);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "visible";
                let back = document.getElementById("BackOption");
                let backClone = back.cloneNode(true);
                back.parentNode.replaceChild(backClone, back);
                document.getElementById("BackOption").addEventListener("click", () => {
                    document.getElementById("Optionscreen").style.visibility = "hidden";
                });
            }
            Game.gamestate = GAMESTATES.PAUSE;
            Game.ƒ.Loop.stop();
        }
    }
    Game.pause = pause;
    function playing(_sync, _triggerOption) {
        if (Game.gamestate == GAMESTATES.PAUSE) {
            if (_sync) {
                Networking.setGamestate(true);
            }
            if (_triggerOption) {
                document.getElementById("Optionscreen").style.visibility = "hidden";
            }
            Game.gamestate = GAMESTATES.PLAYING;
            Game.ƒ.Loop.continue();
        }
    }
    Game.playing = playing;
    async function loadJSON() {
        const loadEnemy = await (await fetch("./Resources/EnemiesStorage.json")).json();
        Game.enemiesJSON = loadEnemy.enemies;
        const loadItem = await (await fetch("./Resources/ItemStorage.json")).json();
        Game.internalItemJSON = loadItem.internalItems;
        Game.buffItemJSON = loadItem.buffItems;
        const loadBullets = await (await fetch("./Resources/BulletStorage.json")).json();
        Game.bulletsJSON = loadBullets.standardBullets;
    }
    async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/map01.png");
        await Bullets.bulletTxt.load("./Resources/Image/arrow01.png");
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
    Game.loadTextures = loadTextures;
    function draw() {
        Game.viewport.draw();
    }
    function cameraUpdate() {
        let direction = Game.ƒ.Vector2.DIFFERENCE(Game.avatar1.mtxLocal.translation.toVector2(), Game.cmpCamera.mtxPivot.translation.toVector2());
        if (Networking.client.id == Networking.client.idHost) {
            direction.scale(Game.deltaTime * damper);
        }
        else {
            direction.scale(Game.avatar1.client.minTimeBetweenTicks * damper);
        }
        Game.cmpCamera.mtxPivot.translate(new Game.ƒ.Vector3(-direction.x, direction.y, 0), true);
    }
    Game.cameraUpdate = cameraUpdate;
    Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, update);
    //#endregion "essential"
})(Game || (Game = {}));
var UI;
(function (UI) {
    //let divUI: HTMLDivElement = <HTMLDivElement>document.getElementById("UI");
    let player1UI = document.getElementById("Player1");
    let player2UI = document.getElementById("Player2");
    function updateUI() {
        //Avatar1 UI
        player1UI.querySelector("#HP").style.width = (Game.avatar1.attributes.healthPoints / Game.avatar1.attributes.maxHealthPoints * 100) + "%";
        //InventoryUI
        Game.avatar1.items.forEach((element) => {
            let exsist = false;
            if (element.imgSrc == undefined) {
                exsist = true;
            }
            else {
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
                let newItem = document.createElement("img");
                newItem.src = element.imgSrc;
                player1UI.querySelector("#Inventory").appendChild(newItem);
            }
        });
        //Avatar2 UI
        if (Game.connected) {
            player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            Game.avatar2.items.forEach((element) => {
                let exsist = false;
                if (element.imgSrc == undefined) {
                    exsist = true;
                }
                else {
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
                    let newItem = document.createElement("img");
                    newItem.src = element.imgSrc;
                    player2UI.querySelector("#Inventory").appendChild(newItem);
                }
            });
        }
    }
    UI.updateUI = updateUI;
    UI.txtZero = new ƒ.TextureImage();
    UI.txtOne = new ƒ.TextureImage();
    UI.txtTow = new ƒ.TextureImage();
    UI.txtThree = new ƒ.TextureImage();
    UI.txtFour = new ƒ.TextureImage();
    UI.txtFive = new ƒ.TextureImage();
    UI.txtSix = new ƒ.TextureImage();
    UI.txtSeven = new ƒ.TextureImage();
    UI.txtEight = new ƒ.TextureImage();
    UI.txtNine = new ƒ.TextureImage();
    UI.txtTen = new ƒ.TextureImage();
    class DamageUI extends ƒ.Node {
        tag = Tag.TAG.DAMAGEUI;
        up = 0.15;
        lifetime = 0.5 * 60;
        randomX = Math.random() * 0.05 - Math.random() * 0.05;
        async lifespan() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Game.graph.removeChild(this);
                }
            }
        }
        constructor(_position, _damage) {
            super("damageUI");
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(0.33, 0.33, 0.33));
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.25);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            this.loadTexture(_damage);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.update);
        }
        update = (_event) => {
            this.move();
            this.lifespan();
        };
        async move() {
            this.cmpTransform.mtxLocal.translate(new ƒ.Vector3(this.randomX, this.up, 0));
            this.cmpTransform.mtxLocal.scale(ƒ.Vector3.ONE(1.01));
        }
        loadTexture(_damage) {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            switch (Math.abs(_damage)) {
                case 0:
                    newTxt = UI.txtZero;
                    break;
                case 1:
                    newTxt = UI.txtOne;
                    break;
                case 2:
                    newTxt = UI.txtTow;
                    break;
                case 3:
                    newTxt = UI.txtThree;
                    break;
                case 4:
                    newTxt = UI.txtFour;
                    break;
                case 5:
                    newTxt = UI.txtFive;
                    break;
                case 6:
                    newTxt = UI.txtSeven;
                    break;
                case 7:
                    newTxt = UI.txtEight;
                    break;
                case 8:
                    newTxt = UI.txtEight;
                    break;
                case 9:
                    newTxt = UI.txtNine;
                    break;
                case 10:
                    newTxt = UI.txtTen;
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
    UI.DamageUI = DamageUI;
    UI.healParticle = new ƒ.TextureImage();
    UI.poisonParticle = new ƒ.TextureImage();
    UI.burnParticle = new ƒ.TextureImage();
    UI.bleedingParticle = new ƒ.TextureImage();
    UI.slowParticle = new ƒ.TextureImage();
    class Particles extends Game.ƒAid.NodeSprite {
        id;
        animationParticles;
        particleframeNumber;
        particleframeRate;
        width;
        height;
        constructor(_id, _texture, _frameCount, _frameRate) {
            super(getNameById(_id));
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(getNameById(this.id), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture));
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;
            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);
        }
    }
    UI.Particles = Particles;
    function getNameById(_id) {
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
})(UI || (UI = {}));
var Entity;
(function (Entity_1) {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimationState;
        performKnockback = false;
        tag;
        netId;
        id;
        attributes;
        collider;
        items = [];
        weapon;
        buffs = [];
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animationContainer;
        idleScale;
        currentKnockback = ƒ.Vector3.ZERO();
        constructor(_id, _attributes, _netId) {
            super(getNameById(_id));
            this.id = _id;
            this.attributes = _attributes;
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            if (_netId != undefined) {
                if (this.netId != undefined) {
                    Networking.popID(this.netId);
                }
                Networking.currentIDs.push({ netId: _netId, netObjectNode: this });
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator(this);
            }
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.updateBuffs();
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }
        setCollider() {
            this.collider.position = this.cmpTransform.mtxLocal.translation.toVector2();
        }
        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                if (!this.buffs[i].doBuffStuff(this)) {
                    console.log(this.buffs.splice(i, 1));
                    Networking.updateBuffList(this.buffs, this.netId);
                }
            }
        }
        collide(_direction) {
            this.canMoveX = true;
            this.canMoveY = true;
            let walls = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            let wallColliders = [];
            walls.forEach(elem => {
                wallColliders.push(elem.collider);
            });
            let mewDirection = _direction.clone;
            if (!mewDirection.equals(Game.ƒ.Vector3.ZERO())) {
                mewDirection.normalize();
                mewDirection.scale((Game.deltaTime * this.attributes.speed));
            }
            this.calculateCollider(wallColliders, mewDirection);
        }
        calculateCollider(_collider, _direction) {
            _collider.forEach((element) => {
                if (element instanceof Collider.Collider) {
                    if (this.collider.collides(element)) {
                        let intersection = this.collider.getIntersection(element);
                        let areaBeforeMove = intersection;
                        if (areaBeforeMove < this.collider.radius + element.radius) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersection(element) != null) {
                                let newIntersection = this.collider.getIntersection(element);
                                let areaAfterMove = newIntersection;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }
                        if (Networking.client.id == Networking.client.idHost) {
                            if (element.ownerNetId == Game.avatar1.netId) {
                                Game.avatar1.getKnockback(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                            if (element.ownerNetId == Game.avatar2.netId) {
                                Networking.knockbackPush(this.attributes.knockbackForce, this.mtxLocal.translation);
                            }
                        }
                    }
                }
                else if (element instanceof Game.ƒ.Rectangle) {
                    if (this.collider.collidesRect(element)) {
                        let intersection = this.collider.getIntersectionRect(element);
                        let areaBeforeMove = intersection.height * intersection.width;
                        if (areaBeforeMove < this.mtxLocal.scaling.x * this.mtxLocal.scaling.y) {
                            let oldPosition = new Game.ƒ.Vector2(this.collider.position.x, this.collider.position.y);
                            let newDirection = new Game.ƒ.Vector2(_direction.x, 0);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveX = false;
                                }
                            }
                            this.collider.position = oldPosition;
                            newDirection = new Game.ƒ.Vector2(0, _direction.y);
                            this.collider.position.transform(ƒ.Matrix3x3.TRANSLATION(newDirection));
                            if (this.collider.getIntersectionRect(element) != null) {
                                let newIntersection = this.collider.getIntersectionRect(element);
                                let areaAfterMove = newIntersection.height * newIntersection.width;
                                if (areaBeforeMove < areaAfterMove) {
                                    this.canMoveY = false;
                                }
                            }
                            this.collider.position = oldPosition;
                        }
                        else {
                            this.canMoveX = false;
                            this.canMoveY = false;
                        }
                    }
                }
            });
        }
        getDamage(_value) {
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                }
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEnemy(this.netId);
                    Networking.popID(this.netId);
                    this.die();
                }
            }
        }
        die() {
            Game.graph.removeChild(this);
        }
        getDamageReduction(_value) {
            return _value * (1 - (this.attributes.armor / 100));
        }
        //#region knockback
        doKnockback(_body) {
        }
        getKnockback(_knockbackForce, _position) {
            if (!this.performKnockback) {
                this.performKnockback = true;
                let direction = Game.ƒ.Vector2.DIFFERENCE(this.cmpTransform.mtxLocal.translation.toVector2(), _position.toVector2()).toVector3(0);
                let knockBackScaling = Game.deltaTime * this.attributes.scale;
                direction.normalize();
                direction.scale(_knockbackForce * (1 / knockBackScaling));
                this.currentKnockback.add(direction);
            }
        }
        reduceKnockback() {
            this.currentKnockback.scale(0.5);
            // console.log(this.currentKnockback.magnitude);
            if (this.currentKnockback.magnitude < 0.0001) {
                this.currentKnockback = Game.ƒ.Vector3.ZERO();
                this.performKnockback = false;
            }
        }
        //#endregion
        switchAnimation(_name) {
            //TODO: if animation doesnt exist dont switch
            let name = ANIMATIONSTATES[_name].toLowerCase();
            if (this.animationContainer != null && this.animationContainer.animations[name] != null) {
                if (this.currentAnimationState != _name) {
                    switch (_name) {
                        case ANIMATIONSTATES.IDLE:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.IDLE;
                            break;
                        case ANIMATIONSTATES.WALK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.WALK;
                            break;
                        case ANIMATIONSTATES.SUMMON:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.SUMMON;
                            break;
                        case ANIMATIONSTATES.ATTACK:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.ATTACK;
                            break;
                    }
                    this.framerate = this.animationContainer.frameRate.find(obj => obj[0] == name)[1];
                    this.setFrameDirection(1);
                    Networking.updateEntityAnimationState(this.currentAnimationState, this.netId);
                }
            }
            else {
                // console.warn("no animationContainer or animation with name: " + name + " at Entity: " + this.name);
            }
        }
    }
    Entity_1.Entity = Entity;
    let ANIMATIONSTATES;
    (function (ANIMATIONSTATES) {
        ANIMATIONSTATES[ANIMATIONSTATES["IDLE"] = 0] = "IDLE";
        ANIMATIONSTATES[ANIMATIONSTATES["WALK"] = 1] = "WALK";
        ANIMATIONSTATES[ANIMATIONSTATES["SUMMON"] = 2] = "SUMMON";
        ANIMATIONSTATES[ANIMATIONSTATES["ATTACK"] = 3] = "ATTACK";
    })(ANIMATIONSTATES = Entity_1.ANIMATIONSTATES || (Entity_1.ANIMATIONSTATES = {}));
    let BEHAVIOUR;
    (function (BEHAVIOUR) {
        BEHAVIOUR[BEHAVIOUR["IDLE"] = 0] = "IDLE";
        BEHAVIOUR[BEHAVIOUR["FOLLOW"] = 1] = "FOLLOW";
        BEHAVIOUR[BEHAVIOUR["FLEE"] = 2] = "FLEE";
        BEHAVIOUR[BEHAVIOUR["SUMMON"] = 3] = "SUMMON";
        BEHAVIOUR[BEHAVIOUR["ATTACK"] = 4] = "ATTACK";
    })(BEHAVIOUR = Entity_1.BEHAVIOUR || (Entity_1.BEHAVIOUR = {}));
    let ID;
    (function (ID) {
        ID["RANGED"] = "ranged";
        ID["MELEE"] = "melee";
        ID["BAT"] = "bat";
        ID["REDTICK"] = "redtick";
        ID["SMALLTICK"] = "smalltick";
        ID["SKELETON"] = "skeleton";
        ID["OGER"] = "oger";
        ID["SUMMONOR"] = "summonor";
    })(ID = Entity_1.ID || (Entity_1.ID = {}));
    function getNameById(_id) {
        switch (_id) {
            case ID.RANGED:
                return "ranged";
            case ID.MELEE:
                return "tank";
            case ID.BAT:
                return "bat";
            case ID.REDTICK:
                return "redTick";
            case ID.SMALLTICK:
                return "smallTick";
            case ID.SKELETON:
                return "skeleton";
            case ID.OGER:
                return "oger";
            case ID.SKELETON:
                return "summonor";
        }
        return null;
    }
    Entity_1.getNameById = getNameById;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy_1) {
    let ENEMYCLASS;
    (function (ENEMYCLASS) {
        ENEMYCLASS[ENEMYCLASS["ENEMYDUMB"] = 0] = "ENEMYDUMB";
        ENEMYCLASS[ENEMYCLASS["ENEMYDASH"] = 1] = "ENEMYDASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYSMASH"] = 2] = "ENEMYSMASH";
        ENEMYCLASS[ENEMYCLASS["ENEMYPATROL"] = 3] = "ENEMYPATROL";
        ENEMYCLASS[ENEMYCLASS["ENEMYSHOOT"] = 4] = "ENEMYSHOOT";
        ENEMYCLASS[ENEMYCLASS["SUMMONOR"] = 5] = "SUMMONOR";
        ENEMYCLASS[ENEMYCLASS["SUMMONORADDS"] = 6] = "SUMMONORADDS";
    })(ENEMYCLASS = Enemy_1.ENEMYCLASS || (Enemy_1.ENEMYCLASS = {}));
    class Enemy extends Entity.Entity {
        currentBehaviour;
        target;
        moveDirection = Game.ƒ.Vector3.ZERO();
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _netId);
            this.attributes = _attributes;
            this.tag = Tag.TAG.ENEMY;
            // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animationContainer.animations["idle"]);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), (this.mtxLocal.scaling.x * this.idleScale) / 2, this.netId);
        }
        update() {
            if (Networking.client.id == Networking.client.idHost) {
                super.update();
                this.moveBehaviour();
                this.move(this.moveDirection);
                Networking.updateEnemyPosition(this.cmpTransform.mtxLocal.translation, this.netId);
            }
        }
        ;
        doKnockback(_body) {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction) {
            // this.moveDirection.add(_direction)
            this.collide(_direction);
            // this.moveDirection.subtract(_direction);
        }
        moveBehaviour() {
        }
        moveSimple(_target) {
            this.target = _target;
            let direction = Game.ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation);
            return direction.toVector2();
        }
        moveAway(_target) {
            let moveSimple = this.moveSimple(_target);
            moveSimple.x *= -1;
            moveSimple.y *= -1;
            return moveSimple;
        }
        die() {
            Game.graph.removeChild(this);
        }
        collide(_direction) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
                console.log("direction: " + _direction.magnitude);
            }
            if (_direction.magnitude > 0) {
                _direction.normalize();
                _direction.add(knockback);
                _direction.scale((Game.deltaTime * this.attributes.speed));
                knockback.scale((Game.deltaTime * this.attributes.speed));
                super.collide(_direction);
                let avatar = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                let avatarColliders = [];
                avatar.forEach((elem) => {
                    avatarColliders.push(elem.collider);
                });
                this.calculateCollider(avatarColliders, _direction);
                if (this.canMoveX && this.canMoveY) {
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                else if (this.canMoveX && !this.canMoveY) {
                    _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                else if (!this.canMoveX && this.canMoveY) {
                    _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                    this.cmpTransform.mtxLocal.translate(_direction);
                }
                _direction.subtract(knockback);
                if (knockback.magnitude > 0) {
                    console.log("knockback: " + knockback.magnitude);
                    console.log("direction: " + _direction.magnitude);
                }
            }
            this.reduceKnockback();
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        behaviour() {
            let target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
            let distance = ƒ.Vector3.DIFFERENCE(target, this.cmpTransform.mtxLocal.translation).magnitude;
            //TODO: set to 3 after testing
            if (distance > 2) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                    break;
                // default:
                //     // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                //     // break;
            }
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemySmash extends Enemy {
        isAttacking = false;
        coolDown = new Ability.Cooldown(50 * 60);
        avatars = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour = Entity.BEHAVIOUR.IDLE;
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= this.animationContainer.animations["attack"].frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            else if (distance < 2 && !this.isAttacking) {
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
                this.isAttacking = true;
            }
            else if (this.currentBehaviour == Entity.BEHAVIOUR.IDLE) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
                this.isAttacking = false;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.ATTACK:
                    this.switchAnimation(Entity.ANIMATIONSTATES.ATTACK);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
            }
        }
    }
    Enemy_1.EnemySmash = EnemySmash;
    class EnemyDash extends Enemy {
        dash = new Ability.Dash(this.netId, 300, 1, 250 * 60, 5);
        lastMoveDireciton;
        dashCount = 1;
        avatars = [];
        randomPlayer = Math.round(Math.random());
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else if (distance < 3) {
                this.dash.doAbility();
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.dash.doesAbility) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.moveSimple(this.target).toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }
    Enemy_1.EnemyDash = EnemyDash;
    class EnemyPatrol extends Enemy {
        patrolPoints = [new ƒ.Vector2(0, 4), new ƒ.Vector2(5, 0)];
        waitTime = 1000;
        currenPointIndex = 0;
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
        }
        moveBehaviour() {
            this.patrol();
        }
        patrol() {
            if (this.mtxLocal.translation.getDistance(ƒ.Vector3.SUM(this.patrolPoints[this.currenPointIndex].toVector3(), Game.currentRoom.mtxLocal.translation)) > 0.3) {
                this.moveDirection = this.moveSimple((ƒ.Vector2.SUM(this.patrolPoints[this.currenPointIndex], Game.currentRoom.mtxLocal.translation.toVector2()))).toVector3();
            }
            else {
                setTimeout(() => {
                    if (this.currenPointIndex + 1 < this.patrolPoints.length) {
                        this.currenPointIndex++;
                    }
                    else {
                        this.currenPointIndex = 0;
                    }
                }, this.waitTime);
            }
        }
    }
    Enemy_1.EnemyPatrol = EnemyPatrol;
    class EnemyShoot extends Enemy {
        viewRadius = 3;
        gotRecognized = false;
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
            this.weapon = new Weapons.Weapon(60, 1, Bullets.BULLETTYPE.STANDARD, 2, this.netId, Weapons.AIM.HOMING);
        }
        moveBehaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 5) {
                this.moveDirection = this.moveAway(this.target).toVector3();
                this.gotRecognized = true;
            }
            else {
                this.moveDirection = ƒ.Vector3.ZERO();
            }
            this.shoot();
        }
        getDamage(_value) {
            super.getDamage(_value);
            this.gotRecognized = true;
        }
        shoot(_netId) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);
            if (_direction.magnitude < 3 || this.gotRecognized) {
                this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, true);
            }
            // if (this.weapon.currentAttackCount > 0 && _direction.magnitude < this.viewRadius) {
            //     _direction.normalize();
            //     // let bullet: Bullets.Bullet = new Bullets.HomingBullet(new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y), _direction, Calculation.getCloserAvatarPosition(this.mtxLocal.translation), _netId);
            //     bullet.owner = this.tag;
            //     bullet.flyDirection.scale(1 / Game.frameRate * bullet.speed);
            //     Game.graph.addChild(bullet);
            //     if (Networking.client.id == Networking.client.idHost) {
            //         Networking.spawnBulletAtEnemy(bullet.netId, this.netId);
            //         this.weapon.currentAttackCount--;
            //     }
            // }
        }
    }
    Enemy_1.EnemyShoot = EnemyShoot;
    class SummonorAdds extends EnemyDash {
        avatar;
        randomPlayer = Math.round(Math.random());
        constructor(_id, _attributes, _position, _target, _netId) {
            super(_id, _attributes, _position, _netId);
            this.avatar = _target;
        }
        behaviour() {
            this.target = this.avatar.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance > 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else if (distance < 3) {
                this.dash.doAbility();
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.dash.doesAbility) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.moveSimple(this.target).toVector3();
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
    }
    Enemy_1.SummonorAdds = SummonorAdds;
    // export class EnemyCircle extends Enemy {
    //     distance: number = 5;
    //     constructor(_name: string, _properties: Player.Character, _position: ƒ.Vector2) {
    //         super(_name, _properties, _position);
    //     }
    //     move(): void {
    //         super.move();
    //         this.moveCircle();
    //     }
    //     lifespan(_graph: ƒ.Node): void {
    //         super.lifespan(_graph);
    //     }
    //     async moveCircle() {
    //         this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation);
    //         console.log(this.target);
    //         let distancePlayer1 = this.cmpTransform.mtxLocal.translation.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
    //         // let distancePlayer2 = this.cmpTransform.mtxLocal.translation.getDistance(Game.player2.cmpTransform.mtxLocal.translation);
    //         if (distancePlayer1 > this.distance) {
    //             this.moveSimple();
    //         }
    //         else {
    //             let degree = Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, this.target)
    //             let add = 0;
    //             // while (distancePlayer1 <= this.distance) {
    //             //     let direction: Game.ƒ.Vector3 = Game.ƒ.Vector3.DIFFERENCE(this.cmpTransform.mtxLocal.translation, InputSystem.calcPositionFromDegree(degree + add, this.distance).toVector3(0));
    //             //     direction.normalize();
    //             //     direction.scale((1 / Game.frameRate * this.properties.attributes.speed));
    //             //     this.cmpTransform.mtxLocal.translate(direction, true);
    //             //     add += 5;
    //             // }
    //         }
    //     }
    // }
})(Enemy || (Enemy = {}));
var Items;
(function (Items) {
    let ITEMID;
    (function (ITEMID) {
        ITEMID[ITEMID["ICEBUCKETCHALLENGE"] = 0] = "ICEBUCKETCHALLENGE";
        ITEMID[ITEMID["DMGUP"] = 1] = "DMGUP";
        ITEMID[ITEMID["SPEEDUP"] = 2] = "SPEEDUP";
        ITEMID[ITEMID["PROJECTILESUP"] = 3] = "PROJECTILESUP";
        ITEMID[ITEMID["HEALTHUP"] = 4] = "HEALTHUP";
        ITEMID[ITEMID["SCALEUP"] = 5] = "SCALEUP";
        ITEMID[ITEMID["SCALEDOWN"] = 6] = "SCALEDOWN";
        ITEMID[ITEMID["ARMORUP"] = 7] = "ARMORUP";
        ITEMID[ITEMID["HOMECOMING"] = 8] = "HOMECOMING";
        ITEMID[ITEMID["TOXICRELATIONSHIP"] = 9] = "TOXICRELATIONSHIP";
        ITEMID[ITEMID["VAMPY"] = 10] = "VAMPY";
        ITEMID[ITEMID["SLOWYSLOW"] = 11] = "SLOWYSLOW";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    Items.txtToxicRelationship = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        tag = Tag.TAG.ITEM;
        id;
        netId = Networking.idGenerator(this);
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        buff = [];
        constructor(_id, _position, _netId) {
            super("item");
            this.id = _id;
            this.position = _position;
            this.transform.mtxLocal.translation = _position.toVector3();
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push({ netId: _netId, netObjectNode: this });
                this.netId = _netId;
            }
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = _position.toVector3();
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }
        getBuffById() {
            let temp = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return new Buff.DamageBuff(Buff.BUFFID.POISON, temp.duration, temp.tickRate, temp.value);
                case ITEMID.VAMPY:
                    return new Buff.DamageBuff(Buff.BUFFID.BLEEDING, temp.duration, temp.tickRate, temp.value);
                case ITEMID.SLOWYSLOW:
                    return new Buff.AttributesBuff(Buff.BUFFID.SLOW, temp.duration, temp.tickRate, temp.value);
                default:
                    return null;
            }
        }
        async loadTexture(_texture) {
            let newTxt = new ƒ.TextureImage();
            newTxt = _texture;
            let newCoat = new ƒ.CoatRemissiveTextured();
            newCoat.texture = newTxt;
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            this.getComponent(Game.ƒ.ComponentMaterial).material = newMtr;
        }
        setTextureById() {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    this.loadTexture(Items.txtIceBucket);
                    break;
                case ITEMID.DMGUP:
                    this.loadTexture(Items.txtIceBucket); //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SPEEDUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.PROJECTILESUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HEALTHUP:
                    this.loadTexture(Items.txtHealthUp);
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SCALEUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.SCALEDOWN:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.ARMORUP:
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.HOMECOMING:
                    break;
                case ITEMID.TOXICRELATIONSHIP:
                    this.loadTexture(Items.txtToxicRelationship);
                    break;
                case ITEMID.VAMPY:
                    this.loadTexture(Items.txtIceBucket);
                    break;
            }
        }
        setPosition(_position) {
            this.mtxLocal.translation = _position.toVector3();
        }
        despawn() {
            Networking.popID(this.netId);
            Networking.removeItem(this.netId);
            Game.graph.removeChild(this);
        }
        doYourThing(_avatar) {
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
        value;
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
            }
            Networking.spawnItem(this, this.id, _position, this.netId);
        }
        doYourThing(_avatar) {
            this.setAttributesById(_avatar);
            this.despawn();
        }
        setAttributesById(_avatar) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    _avatar.attributes.attackPoints += this.value;
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    _avatar.attributes.speed = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    _avatar.weapon.projectileAmount += this.value;
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.attributes.updateScaleDependencies();
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.SCALEDOWN:
                    _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    _avatar.attributes.updateScaleDependencies();
                    _avatar.mtxLocal.scale(new ƒ.Vector3(_avatar.attributes.scale, _avatar.attributes.scale, _avatar.attributes.scale));
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    //TODO: set new collider and sync over network
                    break;
                case ITEMID.ARMORUP:
                    _avatar.attributes.armor += this.value;
                    Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    //TODO: talk with tobi
                    break;
            }
        }
    }
    Items.InternalItem = InternalItem;
    class BuffItem extends Item {
        value;
        tickRate;
        duration;
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            Networking.spawnItem(this, this.id, this.mtxLocal.translation.toVector2(), this.netId);
        }
        doYourThing(_avatar) {
            this.setBuffById(_avatar);
            this.despawn();
        }
        setBuffById(_avatar) {
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    let newBuff = this.buff.find(buff => buff.id == Buff.BUFFID.POISON).clone();
                    newBuff.duration = undefined;
                    newBuff.value = 0.5;
                    _avatar.buffs.push(newBuff);
                    Networking.updateBuffList(_avatar.buffs, _avatar.netId);
                    break;
            }
        }
    }
    Items.BuffItem = BuffItem;
    function getInternalItemById(_id) {
        return Game.internalItemJSON.find(item => item.id == _id);
    }
    Items.getInternalItemById = getInternalItemById;
    function getBuffItemById(_id) {
        return Game.buffItemJSON.find(item => item.id == _id);
    }
    Items.getBuffItemById = getBuffItemById;
})(Items || (Items = {}));
var AnimationGeneration;
(function (AnimationGeneration) {
    AnimationGeneration.txtRedTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtRedTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSmallTickWalk = new ƒ.TextureImage();
    AnimationGeneration.txtBatIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSkeletonWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtOgerWalk = new ƒ.TextureImage();
    AnimationGeneration.txtOgerAttack = new ƒ.TextureImage();
    AnimationGeneration.ƒAid = FudgeAid;
    class AnimationContainer {
        id;
        animations = {};
        scale = [];
        frameRate = [];
        constructor(_id) {
            this.id = _id;
            this.getAnimationById();
        }
        addAnimation(_ani, _scale, _frameRate) {
            this.animations[_ani.name] = _ani;
            this.scale.push([_ani.name, _scale]);
            this.frameRate.push([_ani.name, _frameRate]);
        }
        getAnimationById() {
            switch (this.id) {
                case Entity.ID.BAT:
                    this.addAnimation(batIdle.generatedSpriteAnimation, batIdle.animationScale, batIdle.frameRate);
                    break;
                case Entity.ID.REDTICK:
                    this.addAnimation(redTickIdle.generatedSpriteAnimation, redTickIdle.animationScale, redTickIdle.frameRate);
                    this.addAnimation(redTickWalk.generatedSpriteAnimation, redTickWalk.animationScale, redTickWalk.frameRate);
                    break;
                case Entity.ID.SMALLTICK:
                    this.addAnimation(smallTickIdle.generatedSpriteAnimation, smallTickIdle.animationScale, smallTickIdle.frameRate);
                    this.addAnimation(smallTickWalk.generatedSpriteAnimation, smallTickWalk.animationScale, smallTickWalk.frameRate);
                    break;
                case Entity.ID.SKELETON:
                    this.addAnimation(skeletonIdle.generatedSpriteAnimation, skeletonIdle.animationScale, skeletonIdle.frameRate);
                    this.addAnimation(skeletonWalk.generatedSpriteAnimation, skeletonWalk.animationScale, skeletonWalk.frameRate);
                case Entity.ID.OGER:
                    this.addAnimation(ogerIdle.generatedSpriteAnimation, ogerIdle.animationScale, ogerIdle.frameRate);
                    this.addAnimation(ogerWalk.generatedSpriteAnimation, ogerWalk.animationScale, ogerWalk.frameRate);
                    this.addAnimation(ogerAttack.generatedSpriteAnimation, ogerAttack.animationScale, ogerAttack.frameRate);
            }
        }
    }
    AnimationGeneration.AnimationContainer = AnimationContainer;
    class MyAnimationClass {
        id;
        animationName;
        spriteSheet;
        amountOfFrames;
        frameRate;
        generatedSpriteAnimation;
        animationScale;
        constructor(_id, _animationName, _txtIdle, _amountOfFrames, _frameRate) {
            this.id = _id;
            this.animationName = _animationName;
            this.spriteSheet = _txtIdle;
            this.frameRate = _frameRate;
            this.amountOfFrames = _amountOfFrames;
            generateAnimationFromGrid(this);
        }
    }
    //#region spriteSheet
    let batIdle;
    let redTickIdle;
    let redTickWalk;
    let smallTickIdle;
    let smallTickWalk;
    let skeletonIdle;
    let skeletonWalk;
    let ogerIdle;
    let ogerWalk;
    let ogerAttack;
    //#endregion
    //#region AnimationContainer
    let batAnimation;
    let redTickAnimation;
    let smallTickAnimation;
    let skeletonAnimation;
    let ogerAnimation;
    //#endregion
    function generateAnimationObjects() {
        batIdle = new MyAnimationClass(Entity.ID.BAT, "idle", AnimationGeneration.txtBatIdle, 4, 12);
        redTickIdle = new MyAnimationClass(Entity.ID.REDTICK, "idle", AnimationGeneration.txtRedTickIdle, 6, 12);
        redTickWalk = new MyAnimationClass(Entity.ID.REDTICK, "walk", AnimationGeneration.txtRedTickWalk, 4, 12);
        smallTickIdle = new MyAnimationClass(Entity.ID.SMALLTICK, "idle", AnimationGeneration.txtSmallTickIdle, 6, 12);
        smallTickWalk = new MyAnimationClass(Entity.ID.SMALLTICK, "walk", AnimationGeneration.txtSmallTickWalk, 4, 12);
        skeletonIdle = new MyAnimationClass(Entity.ID.SKELETON, "idle", AnimationGeneration.txtSkeletonIdle, 5, 12);
        skeletonWalk = new MyAnimationClass(Entity.ID.SKELETON, "walk", AnimationGeneration.txtSkeletonWalk, 7, 12);
        ogerIdle = new MyAnimationClass(Entity.ID.OGER, "idle", AnimationGeneration.txtOgerIdle, 5, 6);
        ogerWalk = new MyAnimationClass(Entity.ID.OGER, "walk", AnimationGeneration.txtOgerWalk, 6, 6);
        ogerAttack = new MyAnimationClass(Entity.ID.OGER, "attack", AnimationGeneration.txtOgerAttack, 10, 12);
        batAnimation = new AnimationContainer(Entity.ID.BAT);
        redTickAnimation = new AnimationContainer(Entity.ID.REDTICK);
        smallTickAnimation = new AnimationContainer(Entity.ID.SMALLTICK);
        skeletonAnimation = new AnimationContainer(Entity.ID.SKELETON);
        ogerAnimation = new AnimationContainer(Entity.ID.OGER);
    }
    AnimationGeneration.generateAnimationObjects = generateAnimationObjects;
    function getAnimationById(_id) {
        switch (_id) {
            case Entity.ID.BAT:
                return batAnimation;
            case Entity.ID.REDTICK:
                return redTickAnimation;
            case Entity.ID.SMALLTICK:
                return smallTickAnimation;
            case Entity.ID.SKELETON:
                return skeletonAnimation;
            case Entity.ID.OGER:
                return ogerAnimation;
            default:
                return null;
        }
    }
    AnimationGeneration.getAnimationById = getAnimationById;
    function getPixelRatio(_width, _height) {
        let max = Math.max(_width, _height);
        let min = Math.min(_width, _height);
        let scale = 1 / max * min;
        return scale;
    }
    function generateAnimationFromGrid(_class) {
        let clrWhite = ƒ.Color.CSS("white");
        let coatedSpriteSheet = new ƒ.CoatTextured(clrWhite, _class.spriteSheet);
        let width = _class.spriteSheet.texImageSource.width / _class.amountOfFrames;
        let height = _class.spriteSheet.texImageSource.height;
        let createdAnimation = new AnimationGeneration.ƒAid.SpriteSheetAnimation(_class.animationName, coatedSpriteSheet);
        createdAnimation.generateByGrid(ƒ.Rectangle.GET(0, 0, width, height), _class.amountOfFrames, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(width));
        _class.animationScale = getPixelRatio(width, height);
        _class.generatedSpriteAnimation = createdAnimation;
    }
    AnimationGeneration.generateAnimationFromGrid = generateAnimationFromGrid;
})(AnimationGeneration || (AnimationGeneration = {}));
var Networking;
(function (Networking) {
    class Prediction {
        timer = 0;
        currentTick = 0;
        minTimeBetweenTicks;
        gameTickRate = 62.5;
        bufferSize = 1024;
        ownerNetId;
        get owner() { return Networking.currentIDs.find(elem => elem.netId == this.ownerNetId).netObjectNode; }
        ;
        stateBuffer;
        constructor(_ownerNetId) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }
        handleTick() {
        }
        processMovement(input) {
            return null;
        }
    } //#region  bullet Prediction
    Networking.Prediction = Prediction;
    class BulletPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            let bullet = this.owner;
            bullet.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: bullet.mtxLocal.translation };
            return newStatePayload;
        }
    }
    class ServerBulletPrediction extends BulletPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerBulletPrediction = ServerBulletPrediction;
    class ClientBulletPrediction extends BulletPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        flyDirection;
        AsyncTolerance = 0.1;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
            this.flyDirection = this.owner.flyDirection;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            let inputPayload = { tick: this.currentTick, inputVector: this.flyDirection };
            this.inputBuffer[bufferIndex] = inputPayload;
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector.clone);
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendBulletInput(this.ownerNetId, inputPayload);
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn(this.owner.name + " need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientBulletPrediction = ClientBulletPrediction;
    //#endregion
    //#region  avatar Precdiction
    class AvatarPrediction extends Prediction {
        processMovement(input) {
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }
            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                this.owner.doAbility();
            }
            this.owner.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation };
            return newStatePayload;
        }
    }
    class ClientPrediction extends AvatarPrediction {
        inputBuffer;
        latestServerState;
        lastProcessedState;
        horizontalInput;
        verticalInput;
        doesAbility;
        AsyncTolerance = 0.1;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            this.horizontalInput = InputSystem.move().x;
            this.verticalInput = InputSystem.move().y;
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            if (this.latestServerState != this.lastProcessedState) {
                this.handleServerReconciliation();
            }
            let bufferIndex = this.currentTick % this.bufferSize;
            this.switchAvatarAbilityState();
            let inputPayload = { tick: this.currentTick, inputVector: new ƒ.Vector3(this.horizontalInput, this.verticalInput, 0), doesAbility: this.doesAbility };
            this.inputBuffer[bufferIndex] = inputPayload;
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector.clone);
            this.stateBuffer[bufferIndex] = this.processMovement(inputPayload);
            //send inputPayload to host
            Networking.sendClientInput(this.ownerNetId, inputPayload);
        }
        switchAvatarAbilityState() {
            if (this.owner.id == Entity.ID.RANGED) {
                this.doesAbility = this.owner.dash.doesAbility;
            }
            else {
                this.doesAbility = this.owner.block.doesAbility;
            }
        }
        onServerMovementState(_serverState) {
            this.latestServerState = _serverState;
        }
        handleServerReconciliation() {
            this.lastProcessedState = this.latestServerState;
            let serverStateBufferIndex = this.latestServerState.tick % this.bufferSize;
            let positionError = Game.ƒ.Vector3.DIFFERENCE(this.latestServerState.position, this.stateBuffer[serverStateBufferIndex].position).magnitude;
            if (positionError > this.AsyncTolerance) {
                console.warn("you need to be updated to: X:" + this.latestServerState.position.x + " Y: " + this.latestServerState.position.y);
                this.owner.mtxLocal.translation = this.latestServerState.position;
                this.stateBuffer[serverStateBufferIndex] = this.latestServerState;
                let tickToProcess = (this.latestServerState.tick + 1);
                while (tickToProcess < this.currentTick) {
                    let statePayload = this.processMovement(this.inputBuffer[tickToProcess % this.bufferSize]);
                    let bufferIndex = tickToProcess % this.bufferSize;
                    this.stateBuffer[bufferIndex] = statePayload;
                    tickToProcess++;
                }
            }
        }
    }
    Networking.ClientPrediction = ClientPrediction;
    class ServerPrediction extends AvatarPrediction {
        inputQueue = new Queue();
        updateEntityToCheck(_netId) {
            this.ownerNetId = _netId;
        }
        update() {
            this.timer += Game.deltaTime;
            while (this.timer >= this.minTimeBetweenTicks) {
                this.timer -= this.minTimeBetweenTicks;
                this.handleTick();
                this.currentTick++;
            }
        }
        handleTick() {
            let bufferIndex = -1;
            while (this.inputQueue.getQueueLength() > 0) {
                let inputPayload = this.inputQueue.dequeue();
                bufferIndex = inputPayload.tick % this.bufferSize;
                let statePayload = this.processMovement(inputPayload);
                this.stateBuffer[bufferIndex] = statePayload;
            }
            if (bufferIndex != -1) {
                //Send to client new position
                Networking.sendServerBuffer(this.ownerNetId, this.stateBuffer[bufferIndex]);
            }
        }
        onClientInput(inputPayload) {
            this.inputQueue.enqueue(inputPayload);
        }
    }
    Networking.ServerPrediction = ServerPrediction;
    //#endregion
    class Queue {
        items;
        constructor() {
            this.items = [];
        }
        enqueue(_item) {
            this.items.push(_item);
        }
        dequeue() {
            return this.items.shift();
        }
        getQueueLength() {
            return this.items.length;
        }
        getItems() {
            return this.items;
        }
    }
})(Networking || (Networking = {}));
var Ability;
(function (Ability_1) {
    class Ability {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        abilityCount;
        currentabilityCount;
        duration;
        doesAbility = false;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime) {
            this.ownerNetId = _ownerNetId;
            this.duration = _duration;
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.cooldown = new Cooldown(_cooldownTime);
        }
        doAbility() {
            //do stuff
            if (!this.cooldown.hasCoolDown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCoolDown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility();
                setTimeout(() => {
                    this.deactivateAbility();
                    this.doesAbility = false;
                }, this.duration);
                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCoolDown();
                }
            }
        }
        activateAbility() {
        }
        deactivateAbility() {
        }
    }
    Ability_1.Ability = Ability;
    class Block extends Ability {
        activateAbility() {
            this.owner.attributes.hitable = false;
        }
        deactivateAbility() {
            this.owner.attributes.hitable = true;
        }
    }
    Ability_1.Block = Block;
    class Dash extends Ability {
        speed;
        constructor(_ownerNetId, _duration, _abilityCount, _cooldownTime, _speed) {
            super(_ownerNetId, _duration, _abilityCount, _cooldownTime);
            this.speed = _speed;
        }
        activateAbility() {
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= 5;
        }
        deactivateAbility() {
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= 5;
        }
    }
    Ability_1.Dash = Dash;
    class SpawnSummoners extends Ability {
        activateAbility() {
            if (Networking.client.id == Networking.client.idHost) {
                EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.SMALLTICK, this.owner.mtxLocal.translation.toVector2(), null, Game.avatar1, null);
            }
        }
        deactivateAbility() {
        }
    }
    Ability_1.SpawnSummoners = SpawnSummoners;
    class circleShooot extends Ability {
        bulletAmount;
        bullets = [];
        activateAbility() {
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push();
            }
        }
    }
    Ability_1.circleShooot = circleShooot;
    class Cooldown {
        hasCoolDown;
        coolDown;
        currentCooldown;
        constructor(_number) {
            this.coolDown = _number;
            this.currentCooldown = _number;
        }
        startCoolDown() {
            this.hasCoolDown = true;
            Game.coolDowns.push(this);
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        endCoolDOwn() {
            Game.coolDowns = Game.coolDowns.filter(cd => cd != this);
            this.hasCoolDown = false;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.updateCoolDown();
        };
        updateCoolDown() {
            if (this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            else {
                this.currentCooldown = this.coolDown;
                this.endCoolDOwn();
            }
        }
    }
    Ability_1.Cooldown = Cooldown;
})(Ability || (Ability = {}));
var Entity;
(function (Entity) {
    class Attributes {
        healthPoints;
        maxHealthPoints;
        knockbackForce;
        hitable = true;
        armor;
        speed;
        attackPoints;
        coolDownReduction = 1;
        scale;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction) {
            this.scale = _scale;
            this.armor = _armor;
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
            this.knockbackForce = _knockbackForce;
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
            if (_cooldownReduction != undefined) {
                this.coolDownReduction = _cooldownReduction;
            }
            this.updateScaleDependencies();
        }
        updateScaleDependencies() {
            this.maxHealthPoints = Math.round(this.maxHealthPoints * (100 + (10 * this.scale)) / 100);
            this.healthPoints = Math.round(this.healthPoints * (100 + (10 * this.scale)) / 100);
            this.attackPoints = Math.round(this.attackPoints * this.scale);
            this.speed = Math.fround(this.speed / this.scale);
            this.knockbackForce = this.knockbackForce * (100 + (10 * this.scale)) / 100;
        }
    }
    Entity.Attributes = Attributes;
})(Entity || (Entity = {}));
var Enemy;
(function (Enemy) {
    class Summonor extends Enemy.EnemyShoot {
        damageTaken = 0;
        beginDefencePhase = false;
        defencePhaseTime = 720;
        defencePhaseCurrentTime = 0;
        summonChance = 5;
        summonCooldown = 120;
        summonCurrentCooldown = 0;
        summon = new Ability.SpawnSummoners(this.netId, 0, 5, 5 * 60);
        constructor(_id, _attributes, _position, _netId) {
            super(_id, _attributes, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        cooldown() {
            if (this.summonCurrentCooldown > 0) {
                this.summonCurrentCooldown--;
            }
        }
        behaviour() {
            this.cooldown();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 5) {
                this.gotRecognized = true;
            }
            if (this.damageTaken >= 25) {
                this.attributes.hitable = false;
                this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
            }
            else {
                this.attributes.hitable = true;
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
            }
        }
        getDamage(_value) {
            super.getDamage(_value);
            this.damageTaken += _value;
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.attackingPhase();
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    // this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    this.defencePhase();
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }
        attackingPhase() {
            this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
            this.shoot();
        }
        defencePhase() {
            //TODO: make if dependent from teleport animation frame
            if (!this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                this.moveDirection = this.moveSimple(new ƒ.Vector2(0, -13)).toVector3();
            }
            else {
                if (!this.beginDefencePhase) {
                    this.defencePhaseCurrentTime = Math.round(this.defencePhaseTime + Math.random() * 120);
                    this.beginDefencePhase = true;
                }
                if (this.defencePhaseCurrentTime > 0) {
                    if (this.mtxLocal.translation.equals(new ƒ.Vector2(0, -13).toVector3(), 1)) {
                        this.mtxLocal.translation = new ƒ.Vector2(0, -13).toVector3();
                        // if (this.summonCurrentCooldown <= 0) {
                        // if (this.summon.doesAbility) {
                        let nextState = Math.round(Math.random() * 100);
                        if (nextState <= this.summonChance) {
                            // this.summon();
                            this.summon.doAbility();
                            this.summonCurrentCooldown = this.summonCooldown;
                        }
                        // }
                    }
                    this.defencePhaseCurrentTime--;
                }
                else {
                    this.damageTaken = 0;
                    this.beginDefencePhase = false;
                }
            }
        }
    }
    Enemy.Summonor = Summonor;
})(Enemy || (Enemy = {}));
var Buff;
(function (Buff_1) {
    let BUFFID;
    (function (BUFFID) {
        BUFFID[BUFFID["BLEEDING"] = 0] = "BLEEDING";
        BUFFID[BUFFID["POISON"] = 1] = "POISON";
        BUFFID[BUFFID["HEAL"] = 2] = "HEAL";
        BUFFID[BUFFID["SLOW"] = 3] = "SLOW";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
        duration;
        tickRate;
        id;
        noDuration;
        constructor(_id, _duration, _tickRate) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
        }
        getParticleById(_id) {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                default:
                    return null;
            }
        }
        clone() {
            return this;
        }
        applyBuff(_avatar) {
        }
        addToEntity(_avatar) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        doBuffStuff(_avatar) {
            return null;
        }
    }
    Buff_1.Buff = Buff;
    class DamageBuff extends Buff {
        value;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.value = _value;
        }
        clone() {
            return new DamageBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    _avatar.removeChild(_avatar.getChildren().find(child => child.id == this.id));
                    return false;
                }
                else if (this.duration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.duration--;
                return true;
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.noDuration++;
                return true;
            }
        }
        applyBuff(_avatar) {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffDamgeById(this.id, _avatar);
            }
        }
        getBuffDamgeById(_id, _avatar) {
            switch (_id) {
                case BUFFID.BLEEDING:
                    _avatar.getDamage(this.value);
                    break;
                case BUFFID.POISON:
                    // only do damage to player until he has 20% health
                    if (_avatar instanceof Player.Player) {
                        if (_avatar.attributes.healthPoints > _avatar.attributes.maxHealthPoints * 0.2) {
                            _avatar.getDamage(this.value);
                        }
                    }
                    else {
                        _avatar.getDamage(this.value);
                    }
                    break;
            }
        }
    }
    Buff_1.DamageBuff = DamageBuff;
    class AttributesBuff extends Buff {
        isBuffApplied;
        value;
        removedValue;
        constructor(_id, _duration, _tickRate, _value) {
            super(_id, _duration, _tickRate);
            this.isBuffApplied = false;
            this.value = _value;
        }
        clone() {
            return new AttributesBuff(this.id, this.duration, this.tickRate, this.value);
        }
        doBuffStuff(_avatar) {
            if (this.duration != undefined) {
                if (this.duration <= 0) {
                    this.removeBuff(_avatar);
                    return false;
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.duration--;
                return true;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                    let particle = this.getParticleById(this.id);
                    if (particle != undefined) {
                        _avatar.addChild(particle);
                        particle.activate(true);
                    }
                }
                this.noDuration++;
                return true;
            }
        }
        removeBuff(_avatar) {
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffAttributeById(this.id, _avatar, false);
            }
        }
        applyBuff(_avatar) {
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffAttributeById(this.id, _avatar, true);
            }
        }
        getBuffAttributeById(_id, _avatar, _add) {
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.removedValue = Calculation.subPercentageAmountToValue(_avatar.attributes.speed, 50);
                        _avatar.attributes.speed -= this.removedValue;
                    }
                    else {
                        _avatar.attributes.speed += this.removedValue;
                    }
                    // Networking.updateEntityAttributes(_avatar.attributes, _avatar.netId);
                    break;
            }
        }
    }
    Buff_1.AttributesBuff = AttributesBuff;
})(Buff || (Buff = {}));
var Bullets;
(function (Bullets) {
    let BULLETTYPE;
    (function (BULLETTYPE) {
        BULLETTYPE[BULLETTYPE["STANDARD"] = 0] = "STANDARD";
        BULLETTYPE[BULLETTYPE["HIGHSPEED"] = 1] = "HIGHSPEED";
        BULLETTYPE[BULLETTYPE["SLOW"] = 2] = "SLOW";
        BULLETTYPE[BULLETTYPE["MELEE"] = 3] = "MELEE";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.TAG.BULLET;
        owner;
        get _owner() { return Game.entities.find(elem => elem.netId == this.owner); }
        ;
        netId;
        clientPrediction;
        serverPrediction;
        flyDirection;
        direction;
        collider;
        hitPointsScale;
        speed = 20;
        lifetime = 1 * 60;
        knockbackForce = 4;
        type;
        time = 0;
        killcount = 1;
        despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
                }
            }
        }
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _ownerId, _netId) {
            super(_name);
            if (_netId != undefined) {
                Networking.popID(this.netId);
                Networking.currentIDs.push({ netId: _netId, netObjectNode: this });
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator(this);
            }
            this.speed = _speed;
            this.hitPointsScale = _hitPoints;
            this.lifetime = _lifetime;
            this.knockbackForce = _knockbackForce;
            this.killcount = _killcount;
            // this.addComponent(new ƒ.ComponentLight(new ƒ.LightPoint(ƒ.Color.CSS("white"))));
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0);
            let mesh = new ƒ.MeshQuad();
            let cmpMesh = new ƒ.ComponentMesh(mesh);
            this.addComponent(cmpMesh);
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            let cmpMaterial = new ƒ.ComponentMaterial(mtrSolidWhite);
            this.addComponent(cmpMaterial);
            let colliderPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(colliderPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.owner = _ownerId;
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.cmpTransform.mtxLocal.translate(this.flyDirection);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id && this._owner == Game.avatar1) {
                this.clientPrediction.update();
            }
            else {
                if (this._owner == Game.avatar2) {
                    this.serverPrediction.update();
                }
                else {
                    this.move(this.flyDirection.clone);
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
            }
            if (Networking.client.idHost == Networking.client.id) {
                this.despawn();
            }
        }
        move(_direction) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this._owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.collisionDetection();
        }
        doKnockback(_body) {
        }
        getKnockback(_knockbackForce, _position) {
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        loadTexture() {
            let newTxt = new ƒ.TextureImage();
            let newCoat = new ƒ.CoatRemissiveTextured();
            let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
            let oldComCoat = new ƒ.ComponentMaterial();
            oldComCoat = this.getComponent(ƒ.ComponentMaterial);
            newTxt = Bullets.bulletTxt;
            newCoat.color = ƒ.Color.CSS("WHITE");
            newCoat.texture = newTxt;
            oldComCoat.material = newMtr;
        }
        setBuff(_target) {
            this._owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                });
            });
        }
        collisionDetection() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
            let colliders = [];
            if (this._owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((_elem) => {
                let element = _elem;
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if (element.attributes.healthPoints > 0) {
                        if (element instanceof Enemy.SummonorAdds) {
                            if (element.avatar == this._owner) {
                                this.lifetime = 0;
                                this.killcount--;
                                return;
                            }
                        }
                        element.getDamage(this._owner.attributes.attackPoints * this.hitPointsScale);
                        this.setBuff(element);
                        element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        this.lifetime = 0;
                        this.killcount--;
                    }
                }
            });
            if (this._owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {
                    let element = _elem;
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if (element.attributes.healthPoints > 0 && element.attributes.hitable) {
                            element.getDamage(this.hitPointsScale);
                            element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPointsScale));
                            this.lifetime = 0;
                            this.killcount--;
                        }
                    }
                });
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((_elem) => {
                let element = _elem;
                if (this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class MeleeBullet extends Bullet {
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _netId);
            this.speed = 6;
            this.hitPointsScale = 10;
            this.lifetime = 6;
            this.killcount = 4;
        }
        loadTexture() {
        }
    }
    Bullets.MeleeBullet = MeleeBullet;
    class HomingBullet extends Bullet {
        target;
        rotateSpeed = 2;
        targetDirection;
        constructor(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _ownerId, _target, _netId) {
            super(_name, _speed, _hitPoints, _lifetime, _knockbackForce, _killcount, _position, _direction, _ownerId, _netId);
            this.speed = 20;
            this.hitPointsScale = 1;
            this.lifetime = 1 * 60;
            this.killcount = 1;
            if (_target != null) {
                this.target = _target;
            }
            // else {
            //     this.target = ƒ.Vector3.SUM(this.mtxLocal.translation, _direction);
            // }
            this.targetDirection = _direction;
            if (Networking.client.idHost == Networking.client.id) {
                this.setTarget(Game.avatar1.netId);
            }
        }
        update() {
            // this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.update);
        }
        move(_direction) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            }
            else {
                if (this._owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
            super.update();
        }
        setTarget(_netID) {
            if (Game.entities.find(ent => ent.netId == _netID) != undefined) {
                this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
            }
        }
        calculateHoming() {
            let newDirection = ƒ.Vector3.DIFFERENCE(this.target, this.mtxLocal.translation);
            if (newDirection.x != 0 && newDirection.y != 0) {
                newDirection.normalize();
            }
            let rotateAmount2 = ƒ.Vector3.CROSS(newDirection, this.mtxLocal.getX()).z;
            this.mtxLocal.rotateZ(-rotateAmount2 * this.rotateSpeed);
        }
    }
    Bullets.HomingBullet = HomingBullet;
})(Bullets || (Bullets = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        ownerNetId;
        radius;
        position;
        get top() {
            return (this.position.y - this.radius);
        }
        get left() {
            return (this.position.x - this.radius);
        }
        get right() {
            return (this.position.x + this.radius);
        }
        get bottom() {
            return (this.position.y + this.radius);
        }
        constructor(_position, _radius, _netId) {
            this.position = _position;
            this.radius = _radius;
            this.ownerNetId = _netId;
        }
        collides(_collider) {
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            if (this.radius + _collider.radius > distance.magnitude) {
                return true;
            }
            return false;
        }
        collidesRect(_collider) {
            if (this.left > _collider.right)
                return false;
            if (this.right < _collider.left)
                return false;
            if (this.top > _collider.bottom)
                return false;
            if (this.bottom < _collider.top)
                return false;
            return true;
        }
        getIntersection(_collider) {
            if (!this.collides(_collider))
                return null;
            let distance = ƒ.Vector2.DIFFERENCE(this.position, _collider.position);
            let intersection = this.radius + _collider.radius - distance.magnitude;
            return intersection;
        }
        getIntersectionRect(_collider) {
            if (!this.collidesRect(_collider))
                return null;
            let intersection = new ƒ.Rectangle();
            intersection.x = Math.max(this.left, _collider.left);
            intersection.y = Math.max(this.top, _collider.top);
            intersection.width = Math.min(this.right, _collider.right) - intersection.x;
            intersection.height = Math.min(this.bottom, _collider.bottom) - intersection.y;
            return intersection;
        }
    }
    Collider_1.Collider = Collider;
})(Collider || (Collider = {}));
var EnemySpawner;
(function (EnemySpawner) {
    let spawnTime = 0 * 60;
    let currentTime = spawnTime;
    let maxEnemies = 0;
    function spawnEnemies() {
        if (Networking.client.idHost == Networking.client.id) {
            let currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
            maxEnemies = currentRoom.enemyCount;
            while (maxEnemies > 0) {
                maxEnemies = currentRoom.enemyCount;
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2));
                    position.add(currentRoom.mtxLocal.translation.toVector2());
                    // console.log(position);
                    //TODO: use ID to get random enemies
                    spawnByID(Enemy.ENEMYCLASS.ENEMYSMASH, Entity.ID.OGER, position);
                    currentRoom.enemyCount--;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }
    EnemySpawner.spawnEnemies = spawnEnemies;
    function getRandomEnemyId() {
        let random = Math.round(Math.random() * Object.keys(Entity.ID).length / 2);
        if (random <= 2) {
            return getRandomEnemyId();
        }
        else {
            console.log(random);
            return random;
        }
    }
    function spawnByID(_enemyClass, _id, _position, _attributes, _target, _netID) {
        let enemy;
        let ref = null;
        if (_attributes == null) {
            ref = Game.enemiesJSON.find(enemy => enemy.name == _id.toString());
        }
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDash(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDash(_id, _attributes, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYDASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDumb(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(_id, _attributes, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYPATROL:
                if (_netID == null) {
                    enemy = new Enemy.EnemyPatrol(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyPatrol(_id, _attributes, _position, _netID);
                }
                break;
            // case Enemy.E:
            //     if (_netID == null) {
            //         enemy = new Enemy.EnemyShoot(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
            //     } else {
            //         enemy = new Enemy.EnemyShoot(_id, _attributes, _position, _netID);
            //     }
            //     break;
            case Enemy.ENEMYCLASS.ENEMYSMASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemySmash(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemySmash(_id, _attributes, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                if (_netID == null) {
                    enemy = new Enemy.SummonorAdds(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _target, _netID);
                }
                else {
                    enemy = new Enemy.SummonorAdds(_id, _attributes, _position, _target, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONOR:
                if (_netID == null) {
                    enemy = new Enemy.Summonor(_id, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
                }
                else {
                    enemy = new Enemy.Summonor(_id, _attributes, _position, _netID);
                }
                break;
            default:
                break;
        }
        Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);
        // switch (_id) {
        //     case Entity.ID.BAT:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "bat");
        //             enemy = new Enemy.EnemyDumb(Entity.ID.BAT, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5, ref.attributes.armor), _position, _netID);
        //         } else {
        //             enemy = new Enemy.EnemyDumb(Entity.ID.BAT, _attributes, _position, _netID);
        //         }
        //         break;
        //     case Entity.ID.REDTICK:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "redtick");
        //             enemy = new Enemy.EnemyDash(Entity.ID.REDTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale + (Math.random() * 0.2 - Math.random() * 0.2), ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
        //             // enemy = new Enemy.EnemyShoot(Entity.ID.REDTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * ref.attributes.scale + 0.5, ref.attributes.knockbackForce, ref.attributes.armor), new Weapons.Weapon(50, 1, Bullets.BULLETTYPE.STANDARD, 1), _position, _netID);
        //         }
        //         else {
        //             enemy = new Enemy.EnemyDash(Entity.ID.REDTICK, _attributes, _position, _netID);
        //             // enemy = new Enemy.EnemyShoot(Entity.ID.REDTICK, _attributes, new Weapons.Weapon(50, 1, Bullets.BULLETTYPE.STANDARD, 1), _position, _netID);
        //         }
        //         break;
        //     case Entity.ID.SMALLTICK:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "smalltick");
        //             enemy = new Enemy.EnemyDash(Entity.ID.SMALLTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale + (Math.random() * 0.2 - Math.random() * 0.2), ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
        //         }
        //         else {
        //             enemy = new Enemy.EnemyDash(Entity.ID.SMALLTICK, _attributes, _position, _netID);
        //         }
        //         break;
        //     case Entity.ID.SKELETON:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "skeleton");
        //             enemy = new Enemy.EnemyDumb(Entity.ID.SKELETON, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale + (Math.random() * 0.2 - Math.random() * 0.2), ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
        //         }
        //         else {
        //             enemy = new Enemy.EnemyDumb(Entity.ID.SKELETON, _attributes, _position, _netID);
        //         }
        //         break;
        //     case Entity.ID.OGER:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "oger");
        //             enemy = new Enemy.EnemySmash(Entity.ID.OGER, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale + (Math.random() * 0.2 - Math.random() * 0.2), ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
        //         }
        //         else {
        //             enemy = new Enemy.EnemySmash(Entity.ID.OGER, _attributes, _position, _netID);
        //         }
        //         break;
        //     case Entity.ID.SUMMONOR:
        //         if (_attributes == null && _netID == null) {
        //             const ref = Game.enemiesJSON.find(enemy => enemy.name == "summonor");
        //             enemy = new Enemy.Summonor(Entity.ID.SUMMONOR, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale + (Math.random() * 0.2 - Math.random() * 0.2), ref.attributes.knockbackForce, ref.attributes.armor), _position, _netID);
        //         }
        //         else {
        //             enemy = new Enemy.Summonor(Entity.ID.SUMMONOR, _attributes, _position, _netID);
        //         }
        //         break;
        //     default:
        //         break;
        // }
        if (enemy != null) {
            Game.graph.addChild(enemy);
        }
    }
    EnemySpawner.spawnByID = spawnByID;
    function networkSpawnById(_enemyClass, _id, _position, _attributes, _netID, _target) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _id, _position, _attributes, Game.avatar1, _netID);
            }
            else {
                spawnByID(_enemyClass, _id, _position, _attributes, Game.avatar2, _netID);
            }
        }
        else {
            spawnByID(_enemyClass, _id, _position, _attributes, null, _netID);
        }
    }
    EnemySpawner.networkSpawnById = networkSpawnById;
})(EnemySpawner || (EnemySpawner = {}));
var Calculation;
(function (Calculation) {
    function getCloserAvatarPosition(_startPoint) {
        let target = Game.avatar1;
        if (Game.connected) {
            let distancePlayer1 = _startPoint.getDistance(Game.avatar1.cmpTransform.mtxLocal.translation);
            let distancePlayer2 = _startPoint.getDistance(Game.avatar2.cmpTransform.mtxLocal.translation);
            if (distancePlayer1 < distancePlayer2) {
                target = Game.avatar1;
            }
            else {
                target = Game.avatar2;
            }
        }
        return target.cmpTransform.mtxLocal.translation;
    }
    Calculation.getCloserAvatarPosition = getCloserAvatarPosition;
    function calcDegree(_center, _target) {
        let xDistance = _target.x - _center.x;
        let yDistance = _target.y - _center.y;
        let degrees = Math.atan2(yDistance, xDistance) * (180 / Math.PI) - 90;
        return degrees;
    }
    Calculation.calcDegree = calcDegree;
    function getRotatedVectorByAngle2D(_vectorToRotate, _angle) {
        let angleToRadian = _angle * (Math.PI / 180);
        let newX = _vectorToRotate.x * Math.cos(angleToRadian) - _vectorToRotate.y * Math.sin(angleToRadian);
        let newY = _vectorToRotate.x * Math.sin(angleToRadian) + _vectorToRotate.y * Math.cos(angleToRadian);
        return new ƒ.Vector3(newX, newY, _vectorToRotate.z);
    }
    Calculation.getRotatedVectorByAngle2D = getRotatedVectorByAngle2D;
    function addPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * ((100 + _percentageAmount) / 100);
    }
    Calculation.addPercentageAmountToValue = addPercentageAmountToValue;
    function subPercentageAmountToValue(_baseValue, _percentageAmount) {
        return _baseValue * (100 / (100 + _percentageAmount));
    }
    Calculation.subPercentageAmountToValue = subPercentageAmountToValue;
})(Calculation || (Calculation = {}));
var InputSystem;
(function (InputSystem) {
    document.addEventListener("keydown", keyboardDownEvent);
    document.addEventListener("keyup", keyboardUpEvent);
    Game.canvas.addEventListener("mousedown", attack);
    Game.canvas.addEventListener("mousemove", rotateToMouse);
    //#region rotate
    let mousePosition;
    function rotateToMouse(_mouseEvent) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let ray = Game.viewport.getRayFromClient(new ƒ.Vector2(_mouseEvent.offsetX, _mouseEvent.offsetY));
            mousePosition = ray.intersectPlane(new ƒ.Vector3(0, 0, 0), new ƒ.Vector3(0, 0, 1));
            // Game.avatar1.mtxLocal.rotation = new ƒ.Vector3(0, 0, Calculation.calcDegree(Game.avatar1.mtxLocal.translation, mousePosition));
        }
    }
    function calcPositionFromDegree(_degrees, _distance) {
        let distance = 5;
        let newDeg = (_degrees * Math.PI) / 180;
        let y = Math.cos(newDeg);
        let x = Math.sin(newDeg) * -1;
        let coord = new ƒ.Vector2(x, y);
        coord.scale(distance);
        return coord;
    }
    InputSystem.calcPositionFromDegree = calcPositionFromDegree;
    //#endregion
    //#region move and ability
    let controller = new Map([
        ["W", false],
        ["A", false],
        ["S", false],
        ["D", false]
    ]);
    function keyboardDownEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            if (_e.code.toUpperCase() != "SPACE") {
                let key = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            }
            else {
                //Do abilty from player
                ability();
            }
        }
        if (_e.code.toUpperCase() == "ESCAPE") {
            if (Game.gamestate == Game.GAMESTATES.PLAYING) {
                Game.pause(true, true);
            }
            else {
                Game.playing(true, true);
            }
        }
    }
    function keyboardUpEvent(_e) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let key = _e.code.toUpperCase().substring(3);
            controller.set(key, false);
        }
    }
    function move() {
        let moveVector = Game.ƒ.Vector3.ZERO();
        if (controller.get("W")) {
            moveVector.y += 1;
        }
        if (controller.get("A")) {
            moveVector.x -= 1;
        }
        if (controller.get("S")) {
            moveVector.y -= 1;
        }
        if (controller.get("D")) {
            moveVector.x += 1;
        }
        // Game.avatar1.move(moveVector);
        return moveVector;
    }
    InputSystem.move = move;
    function ability() {
        Game.avatar1.doAbility();
    }
    //#endregion
    //#region attack
    function attack(e_) {
        if (Game.gamestate == Game.GAMESTATES.PLAYING) {
            let mouseButton = e_.button;
            switch (mouseButton) {
                case 0:
                    //left mouse button player.attack
                    let direction = ƒ.Vector3.DIFFERENCE(mousePosition, Game.avatar1.mtxLocal.translation);
                    rotateToMouse(e_);
                    // console.clear();
                    Game.avatar1.attack(direction, null, true);
                    break;
                case 2:
                    //TODO: right mouse button player.heavyAttack or something like that
                    break;
                default:
                    break;
            }
        }
    }
    //#endregion
})(InputSystem || (InputSystem = {}));
var Level;
(function (Level) {
    class Landscape extends ƒ.Node {
        constructor(_name) {
            super(_name);
            // this.getChildren()[0].getComponent(Game.ƒ.ComponentTransform).mtxLocal.translateZ(-2)
        }
    }
    Level.Landscape = Landscape;
})(Level || (Level = {}));
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
var Networking;
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
(function (Networking) {
    let FUNCTION;
    (function (FUNCTION) {
        FUNCTION[FUNCTION["CONNECTED"] = 0] = "CONNECTED";
        FUNCTION[FUNCTION["SETGAMESTATE"] = 1] = "SETGAMESTATE";
        FUNCTION[FUNCTION["LOADED"] = 2] = "LOADED";
        FUNCTION[FUNCTION["HOST"] = 3] = "HOST";
        FUNCTION[FUNCTION["SETREADY"] = 4] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 5] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 6] = "TRANSFORM";
        FUNCTION[FUNCTION["CLIENTMOVEMENT"] = 7] = "CLIENTMOVEMENT";
        FUNCTION[FUNCTION["SERVERBUFFER"] = 8] = "SERVERBUFFER";
        FUNCTION[FUNCTION["UPDATEINVENTORY"] = 9] = "UPDATEINVENTORY";
        FUNCTION[FUNCTION["KNOCKBACKREQUEST"] = 10] = "KNOCKBACKREQUEST";
        FUNCTION[FUNCTION["KNOCKBACKPUSH"] = 11] = "KNOCKBACKPUSH";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 12] = "SPAWNBULLET";
        FUNCTION[FUNCTION["BULLETPREDICT"] = 13] = "BULLETPREDICT";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 14] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 15] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 16] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 17] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENTITYANIMATIONSTATE"] = 18] = "ENTITYANIMATIONSTATE";
        FUNCTION[FUNCTION["ENEMYDIE"] = 19] = "ENEMYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 20] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 21] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 22] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 23] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 24] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 25] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 26] = "UPDATEBUFF";
        FUNCTION[FUNCTION["UPDATEUI"] = 27] = "UPDATEUI";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    Networking.clients = [];
    Networking.someoneIsHost = false;
    Networking.currentIDs = [];
    document.getElementById("HostSpawn").addEventListener("click", () => { spawnPlayer(); }, true);
    let IPConnection = document.getElementById("IPConnection");
    document.getElementById("Connecting").addEventListener("click", connecting, true);
    function connecting() {
        Networking.client = new ƒClient();
        Networking.client.addEventListener(FudgeNet.EVENT.MESSAGE_RECEIVED, receiveMessage);
        Networking.client.connectToServer(IPConnection.value);
        addClientID();
        function addClientID() {
            if (Networking.client.id != undefined) {
                let obj = { id: Networking.client.id, ready: false };
                Networking.clients.push(obj);
            }
            else {
                setTimeout(addClientID, 300);
            }
        }
    }
    Networking.connecting = connecting;
    async function receiveMessage(_event) {
        if (_event instanceof MessageEvent) {
            let message = JSON.parse(_event.data);
            if (message.content != undefined && message.content.text == FUNCTION.LOADED.toString()) {
                Game.loaded = true;
            }
            if (message.idSource != Networking.client.id) {
                if (message.command != FudgeNet.COMMAND.SERVER_HEARTBEAT && message.command != FudgeNet.COMMAND.CLIENT_HEARTBEAT) {
                    //Add new client to array clients
                    if (message.content != undefined && message.content.text == FUNCTION.CONNECTED.toString()) {
                        if (message.content.value != Networking.client.id && Networking.clients.find(element => element == message.content.value) == undefined) {
                            if (Networking.clients.find(elem => elem.id == message.content.value) == null) {
                                Networking.clients.push({ id: message.content.value, ready: false });
                            }
                        }
                    }
                    if (message.content != undefined && message.content.text == FUNCTION.SETGAMESTATE.toString()) {
                        if (message.content.playing) {
                            Game.playing(false, true);
                        }
                        else if (!message.content.playing) {
                            Game.pause(false, true);
                        }
                    }
                    //FROM CLIENT INPUT VECTORS FROM AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.CLIENTMOVEMENT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector, doesAbility: message.content.input.doesAbility };
                        Game.serverPredictionAvatar.updateEntityToCheck(message.content.netId);
                        Game.serverPredictionAvatar.onClientInput(input);
                    }
                    // TO CLIENT CALCULATED POSITION FOR AVATAR
                    if (message.content != undefined && message.content.text == FUNCTION.SERVERBUFFER.toString()) {
                        let netObj = Networking.currentIDs.find(entity => entity.netId == message.content.netId);
                        let position = new Game.ƒ.Vector3(message.content.buffer.position.data[0], message.content.buffer.position.data[1], message.content.buffer.position.data[2]);
                        let state = { tick: message.content.buffer.tick, position: position };
                        if (netObj != undefined) {
                            let obj = netObj.netObjectNode;
                            if (obj instanceof Player.Player) {
                                obj.client.onServerMovementState(state);
                            }
                            else {
                                obj.clientPrediction.onServerMovementState(state);
                            }
                        }
                    }
                    //FROM CLIENT BULLET VECTORS
                    if (message.content != undefined && message.content.text == FUNCTION.BULLETPREDICT.toString()) {
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector };
                        let temp = Networking.currentIDs.find(elem => elem.netId == message.content.netId);
                        let bullet;
                        if (temp != undefined) {
                            bullet = temp.netObjectNode;
                            bullet.serverPrediction.updateEntityToCheck(message.content.netId);
                            bullet.serverPrediction.onClientInput(input);
                        }
                    }
                    //Set client ready
                    if (message.content != undefined && message.content.text == FUNCTION.SETREADY.toString()) {
                        if (Networking.clients.find(element => element.id == message.content.netId) != null) {
                            Networking.clients.find(element => element.id == message.content.netId).ready = true;
                        }
                    }
                    //Spawn avatar2 as ranged or melee 
                    if (message.content != undefined && message.content.text == FUNCTION.SPAWN.toString()) {
                        let netId = message.content.netId;
                        if (message.content.type == Entity.ID.MELEE) {
                            const attributes = message.content.attributes;
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        }
                        else if (message.content.type == Entity.ID.RANGED) {
                            const attributes = message.content.attributes;
                            Game.avatar2 = new Player.Ranged(Entity.ID.RANGED, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        }
                    }
                    //Runtime updates and communication
                    if (Game.connected) {
                        //Sync avatar2 position and rotation
                        if (message.content != undefined && message.content.text == FUNCTION.TRANSFORM.toString()) {
                            // let test: Game.ƒ.Vector3 = message.content.value.data;
                            // // console.log(test);
                            let moveVector = new Game.ƒ.Vector3(message.content.value.data[0], message.content.value.data[1], message.content.value.data[2]);
                            let rotateVector = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                            if (Game.avatar2 != undefined) {
                                Game.avatar2.mtxLocal.translation = moveVector;
                                Game.avatar2.mtxLocal.rotation = rotateVector;
                                Game.avatar2.collider.position = moveVector.toVector2();
                                if (Networking.client.id == Networking.client.idHost) {
                                    // Game.avatar2.avatarPrediction();
                                }
                            }
                        }
                        //Update inventory
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEINVENTORY.toString()) {
                            let newItem;
                            if (Items.getBuffItemById(message.content.itemId) != null) {
                                newItem = new Items.BuffItem(message.content.itemId, ƒ.Vector2.ZERO(), message.content.itemNetId);
                            }
                            else if (Items.getInternalItemById(message.content.itemId) != null) {
                                newItem = new Items.InternalItem(message.content.itemId, ƒ.Vector2.ZERO(), message.content.itemNetId);
                            }
                            Game.entities.find(elem => elem.netId == message.content.netId).items.push(newItem);
                        }
                        //Client request for move knockback
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKREQUEST.toString()) {
                            let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                            let enemy = Game.enemies.find(elem => elem.netId == message.content.netId);
                            enemy.getKnockback(message.content.knockbackForce, position);
                        }
                        //Host push move knockback from enemy
                        if (message.content != undefined && message.content.text == FUNCTION.KNOCKBACKPUSH.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let position = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.avatar1.getKnockback(message.content.knockbackForce, position);
                            }
                        }
                        //Spawn bullet from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNBULLET.toString()) {
                            let bullet;
                            let entity = Game.entities.find(elem => elem.netId == message.content.ownerNetId);
                            if (entity != null) {
                                let weapon = entity.weapon;
                                const ref = Game.bulletsJSON.find(bullet => bullet.type == weapon.bulletType);
                                let direciton = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                                switch (message.content.aimType) {
                                    case Weapons.AIM.NORMAL:
                                        bullet = new Bullets.Bullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, message.content.bulletNetId);
                                        break;
                                    case Weapons.AIM.HOMING:
                                        let bulletTarget = new Game.ƒ.Vector3(message.content.bulletTarget.data[0], message.content.bulletTarget.data[1], message.content.bulletTarget.data[2]);
                                        bullet = new Bullets.HomingBullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, bulletTarget, message.content.bulletNetId);
                                        break;
                                    default:
                                        break;
                                }
                                Game.graph.addChild(bullet);
                            }
                        }
                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                let newRotation = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.translation = newPosition;
                                Game.bullets.find(element => element.netId == message.content.netId).mtxLocal.rotation = newRotation;
                            }
                        }
                        //Kill bullet at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETDIE.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let bullet = Game.bullets.find(element => element.netId == message.content.netId);
                                if (bullet != undefined) {
                                    bullet.lifetime = 0;
                                    bullet.despawn();
                                }
                            }
                        }
                        //Spawn enemy at the client 
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNENEMY.toString()) {
                            //TODO: change attributes
                            const attributes = message.content.attributes;
                            EnemySpawner.networkSpawnById(message.content.enemyClass, message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), attributes, message.content.netId, message.content.target);
                        }
                        //Sync enemy transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYTRANSFORM.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            if (enemy != undefined) {
                                enemy.cmpTransform.mtxLocal.translation = new ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                enemy.setCollider();
                            }
                        }
                        //Sync animation state
                        if (message.content != undefined && message.content.text == FUNCTION.ENTITYANIMATIONSTATE.toString()) {
                            let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                            if (entity != undefined) {
                                entity.switchAnimation(message.content.state);
                            }
                        }
                        //Kill enemy at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENEMYDIE.toString()) {
                            let enemy = Game.enemies.find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(enemy);
                            popID(message.content.netId);
                        }
                        //update Entity buff List
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                            const buffList = message.content.buffList;
                            let newBuffs = [];
                            buffList.forEach(buff => {
                                switch (buff.id) {
                                    case Buff.BUFFID.POISON:
                                        newBuffs.push(new Buff.DamageBuff(buff.id, buff.duration, buff.tickRate, buff.value));
                                        break;
                                }
                            });
                            let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                            entity.buffs.forEach(buff => {
                                let flag = false;
                                newBuffs.forEach(newBuff => {
                                    if (buff.id == newBuff.id) {
                                        flag = true;
                                    }
                                });
                                if (!flag) {
                                    entity.removeChild(entity.getChildren().find(child => child.id == buff.id));
                                }
                            });
                            entity.buffs = newBuffs;
                        }
                        //update UI
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                            let position = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                            Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                        }
                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                if (Items.getBuffItemById(message.content.id) != null) {
                                    Game.graph.addChild(new Items.BuffItem(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId));
                                }
                                else if (Items.getInternalItemById(message.content.id) != null) {
                                    Game.graph.addChild(new Items.InternalItem(message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId));
                                }
                            }
                        }
                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            const tempAttributes = message.content.attributes;
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            entity.attributes = tempAttributes;
                            entity.mtxLocal.scale(new ƒ.Vector3(Game.avatar2.attributes.scale, Game.avatar2.attributes.scale, Game.avatar2.attributes.scale));
                        }
                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            const tempWeapon = new Weapons.Weapon(message.content.weapon.cooldownTime, message.content.weapon.attackCount, message.content.weapon.bulletType, message.content.weapon.projectileAmount, message.content.weapon.owner, message.content.weapon.aimType);
                            Game.entities.find(elem => elem.netId == message.content.netId).weapon = tempWeapon;
                        }
                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                        // send is hostMessage
                        if (message.content != undefined && message.content.text == FUNCTION.HOST.toString()) {
                            Networking.someoneIsHost = true;
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let coordiantes = new Game.ƒ.Vector2(message.content.room.coordinates.data[0], message.content.room.coordinates.data[1]);
                            let tanslation = new Game.ƒ.Vector3(message.content.room.translation.data[0], message.content.room.translation.data[1], message.content.room.translation.data[2]);
                            let room = { coordinates: coordiantes, direction: message.content.room.direction, exits: message.content.room.exits, roomType: message.content.room.roomType, translation: tanslation };
                            let newRoom = new Generation.Room("room", room.coordinates, room.exits, room.roomType);
                            newRoom.mtxLocal.translation = room.translation;
                            newRoom.addWalls();
                            newRoom.setDoors();
                            if (room.direction != null) {
                                Generation.addRoomToGraph(newRoom, room.direction);
                            }
                            else {
                                Generation.addRoomToGraph(newRoom);
                            }
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            let coordiantes = new Game.ƒ.Vector2(message.content.coordiantes.data[0], message.content.coordiantes.data[1]);
                            let currentroom = Generation.rooms.find(elem => elem.coordinates.equals(coordiantes));
                            Generation.switchRoom(currentroom, message.content.direction);
                        }
                    }
                }
            }
        }
    }
    function setClientReady() {
        Networking.clients.find(element => element.id == Networking.client.id).ready = true;
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SETREADY, netId: Networking.client.id } });
    }
    Networking.setClientReady = setClientReady;
    function setGamestate(_playing) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SETGAMESTATE, playing: _playing } });
    }
    Networking.setGamestate = setGamestate;
    //#region player
    function setHost() {
        if (Networking.client.idHost == undefined) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.HOST, id: Networking.client.id } });
            if (!Networking.someoneIsHost) {
                Networking.client.becomeHost();
                Networking.someoneIsHost = true;
            }
        }
        else {
            Networking.someoneIsHost = true;
        }
    }
    Networking.setHost = setHost;
    function loaded() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.LOADED } });
    }
    Networking.loaded = loaded;
    function spawnPlayer() {
        if (Game.avatar1.id == Entity.ID.MELEE) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.MELEE, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
        }
        else {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: FUNCTION.SPAWN, type: Entity.ID.RANGED, attributes: Game.avatar1.attributes, position: Game.avatar1.cmpTransform.mtxLocal.translation, netId: Game.avatar1.netId } });
        }
    }
    Networking.spawnPlayer = spawnPlayer;
    function setClient() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.VIA_SERVER, content: { text: Networking.FUNCTION.CONNECTED, value: Networking.client.id } });
    }
    Networking.setClient = setClient;
    function updateAvatarPosition(_position, _rotation) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.TRANSFORM, value: _position, rotation: _rotation } });
    }
    Networking.updateAvatarPosition = updateAvatarPosition;
    function sendClientInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.CLIENTMOVEMENT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendClientInput = sendClientInput;
    function sendServerBuffer(_netId, _buffer) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SERVERBUFFER, netId: _netId, buffer: _buffer } });
        }
    }
    Networking.sendServerBuffer = sendServerBuffer;
    function knockbackRequest(_netId, _knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.KNOCKBACKREQUEST, netId: _netId, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackRequest = knockbackRequest;
    function knockbackPush(_knockbackForce, _position) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.KNOCKBACKPUSH, knockbackForce: _knockbackForce, position: _position } });
    }
    Networking.knockbackPush = knockbackPush;
    function updateInventory(_itemId, _itemNetId, _netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.UPDATEINVENTORY, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
    }
    Networking.updateInventory = updateInventory;
    //#endregion
    //#region bullet
    function spawnBullet(_aimType, _direction, _bulletNetId, _ownerNetId, _bulletTarget) {
        if (Game.connected) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.SPAWNBULLET, aimType: _aimType, direction: _direction, ownerNetId: _ownerNetId, bulletNetId: _bulletNetId, bulletTarget: _bulletTarget } });
        }
    }
    Networking.spawnBullet = spawnBullet;
    function sendBulletInput(_netId, _inputPayload) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.BULLETPREDICT, netId: _netId, input: _inputPayload } });
    }
    Networking.sendBulletInput = sendBulletInput;
    function updateBullet(_position, _rotation, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId } });
        }
    }
    Networking.updateBullet = updateBullet;
    function removeBullet(_netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETDIE, netId: _netId } });
        }
    }
    Networking.removeBullet = removeBullet;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
    }
    Networking.updateEnemyPosition = updateEnemyPosition;
    function updateEntityAnimationState(_state, _netId) {
        if (Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } });
        }
        // else {
        //     client.dispatch({ route: undefined, idTarget: clients.find(elem => elem.id == client.idHost).id, content: { text: FUNCTION.ENTITYANIMATIONSTATE, state: _state, netId: _netId } })
        // }
    }
    Networking.updateEntityAnimationState = updateEntityAnimationState;
    function removeEnemy(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYDIE, netId: _netId } });
    }
    Networking.removeEnemy = removeEnemy;
    //#endregion
    //#region items
    function spawnItem(_item, _id, _position, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, item: _item, id: _id, position: _position, netId: _netId } });
        }
    }
    Networking.spawnItem = spawnItem;
    function updateEntityAttributes(_attributes, _netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, attributes: _attributes, netId: _netId } });
        }
    }
    Networking.updateEntityAttributes = updateEntityAttributes;
    function updateAvatarWeapon(_weapon, _targetNetId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEWEAPON, weapon: _weapon, netId: _targetNetId } });
        }
    }
    Networking.updateAvatarWeapon = updateAvatarWeapon;
    function removeItem(_netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ITEMDIE, netId: _netId } });
        }
    }
    Networking.removeItem = removeItem;
    //#endregion
    //#region buffs
    function updateBuffList(_buffList, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEBUFF, buffList: _buffList, netId: _netId } });
        }
    }
    Networking.updateBuffList = updateBuffList;
    //#endregion
    //#region UI
    function updateUI(_position, _value) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEUI, position: _position, value: _value } });
        }
    }
    Networking.updateUI = updateUI;
    //#endregion
    //#region room
    function sendRoom(_room) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, room: _room } });
        }
    }
    Networking.sendRoom = sendRoom;
    function switchRoomRequest(_coordiantes, _direction) {
        if (Game.connected && Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, coordiantes: _coordiantes, direction: _direction } });
        }
    }
    Networking.switchRoomRequest = switchRoomRequest;
    //#endregion
    function idGenerator(_object) {
        let id = Math.floor(Math.random() * 1000);
        if (Networking.currentIDs.find(element => element.netId == id)) {
            idGenerator(_object);
        }
        else {
            Networking.currentIDs.push({ netId: id, netObjectNode: _object });
        }
        return id;
    }
    Networking.idGenerator = idGenerator;
    function popID(_id) {
        let index;
        Networking.currentIDs = Networking.currentIDs.filter(elem => elem.netId != _id);
    }
    Networking.popID = popID;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    class Player extends Entity.Entity {
        weapon = new Weapons.Weapon(6, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        client;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        constructor(_id, _attributes, _netId) {
            super(_id, _attributes, _netId);
            this.tag = Tag.TAG.PLAYER;
            this.client = new Networking.ClientPrediction(this.netId);
        }
        move(_direction) {
            if (_direction.magnitude > 0) {
                _direction.normalize();
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else if (_direction.magnitude == 0) {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
            this.setCollider();
            this.scaleMoveVector(_direction);
            this.moveDirection.add(_direction);
            this.collide(this.moveDirection);
            this.moveDirection.subtract(_direction);
            let doors = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).doors;
            doors.forEach((element) => {
                if (this.collider.collidesRect(element.collider)) {
                    element.changeRoom();
                }
            });
        }
        scaleMoveVector(_direction) {
            if (Networking.client.id == Networking.client.idHost && this == Game.avatar1) {
                _direction.scale((Game.deltaTime * this.attributes.speed));
            }
            else {
                _direction.scale((this.client.minTimeBetweenTicks * this.attributes.speed));
            }
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                this.client.update();
            }
            else {
                this.move(InputSystem.move());
            }
        }
        collide(_direction) {
            super.collide(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.getItemCollision();
            }
            let enemies = Game.enemies;
            let enemiesCollider = [];
            enemies.forEach(element => {
                enemiesCollider.push(element.collider);
            });
            this.calculateCollider(enemiesCollider, _direction);
            if (this.canMoveX && this.canMoveY) {
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (this.canMoveX && !this.canMoveY) {
                _direction = new ƒ.Vector3(_direction.x, 0, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
            else if (!this.canMoveX && this.canMoveY) {
                _direction = new ƒ.Vector3(0, _direction.y, _direction.z);
                this.cmpTransform.mtxLocal.translate(_direction);
            }
        }
        getItemCollision() {
            let itemCollider = Game.items;
            itemCollider.forEach(item => {
                if (this.collider.collides(item.collider)) {
                    Networking.updateInventory(item.id, item.netId, this.netId);
                    item.doYourThing(this);
                    this.items.push(item);
                    if (item instanceof Items.InternalItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + item.value);
                    }
                    if (item instanceof Items.BuffItem) {
                        console.log(item.name + ": " + item.description + " smth changed to: " + Buff.BUFFID[item.buff[0].id].toString());
                    }
                }
            });
        }
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        doKnockback(_body) {
            // (<Enemy.Enemy>_body).getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        doAbility() {
        }
    }
    Player_1.Player = Player;
    class Melee extends Player {
        block = new Ability.Block(this.netId, 600, 1, 5 * 60);
        abilityCooldownTime = 40;
        currentabilityCooldownTime = this.abilityCooldownTime;
        weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.MELEE, 1, this.netId, Weapons.AIM.NORMAL);
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        //Block
        doAbility() {
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        dash = new Ability.Dash(this.netId, 150, 1, 5 * 60, 2);
        performAbility = false;
        lastMoveDirection;
        move(_direction) {
            if (this.dash.doesAbility) {
                super.move(this.lastMoveDirection);
            }
            else {
                super.move(_direction);
                if (_direction.magnitude > 0) {
                    this.lastMoveDirection = _direction;
                }
            }
        }
        //Dash
        doAbility() {
            this.dash.doAbility();
        }
    }
    Player_1.Ranged = Ranged;
})(Player || (Player = {}));
var Generation;
(function (Generation) {
    let ROOMTYPE;
    (function (ROOMTYPE) {
        ROOMTYPE[ROOMTYPE["START"] = 0] = "START";
        ROOMTYPE[ROOMTYPE["NORMAL"] = 1] = "NORMAL";
        ROOMTYPE[ROOMTYPE["MERCHANT"] = 2] = "MERCHANT";
        ROOMTYPE[ROOMTYPE["TREASURE"] = 3] = "TREASURE";
        ROOMTYPE[ROOMTYPE["CHALLENGE"] = 4] = "CHALLENGE";
        ROOMTYPE[ROOMTYPE["BOSS"] = 5] = "BOSS";
    })(ROOMTYPE = Generation.ROOMTYPE || (Generation.ROOMTYPE = {}));
    Generation.txtStartRoom = new Game.ƒ.TextureImage();
    class Room extends ƒ.Node {
        tag = Tag.TAG.ROOM;
        roomType;
        coordinates;
        walls = [];
        doors = [];
        finished = false;
        enemyCount;
        positionUpdated = false;
        neighbourN;
        neighbourE;
        neighbourS;
        neighbourW;
        roomSize = 30;
        exits; // N E S W
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtStartRoom));
        normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
        cmpMaterial;
        constructor(_name, _coordiantes, _exits, _roomType) {
            super(_name);
            this.coordinates = _coordiantes;
            this.exits = _exits;
            this.roomType = _roomType;
            switch (_roomType) {
                case ROOMTYPE.START:
                    this.enemyCount = 2;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.startRoomMat);
                    break;
                case ROOMTYPE.NORMAL:
                    this.enemyCount = Math.round(Math.random() * 10) + 20;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.normalRoomMat);
                    break;
                case ROOMTYPE.MERCHANT:
                    this.enemyCount = 0;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.merchantRoomMat);
                    break;
                case ROOMTYPE.TREASURE:
                    this.enemyCount = 0;
                    this.roomSize = 8;
                    this.finished = true;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.treasureRoomMat);
                    break;
                case ROOMTYPE.CHALLENGE:
                    this.enemyCount = Math.round(Math.random() * 20) + 30;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.challengeRoomMat);
                    break;
                case ROOMTYPE.BOSS:
                    this.enemyCount = 0;
                    this.cmpMaterial = new ƒ.ComponentMaterial(this.bossRoomMat);
                    break;
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scale(new ƒ.Vector3(this.roomSize, this.roomSize, 0));
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x * this.roomSize, this.coordinates.y * this.roomSize, -0.01);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            if (this.enemyCount <= 0) {
                this.finished = true;
            }
        }
        addWalls() {
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, { north: true, east: false, south: false, west: false }));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, { north: false, east: true, south: false, west: false }));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, { north: false, east: false, south: true, west: false }));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, { north: false, east: false, south: false, west: true }));
        }
        setDoors() {
            if (this.exits.north) {
                let exit = { north: true, east: false, south: false, west: false };
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), exit, this.roomSize));
            }
            if (this.exits.east) {
                let exit = { north: false, east: true, south: false, west: false };
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), exit, this.roomSize));
            }
            if (this.exits.south) {
                let exit = { north: false, east: false, south: true, west: false };
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), exit, this.roomSize));
            }
            if (this.exits.west) {
                let exit = { north: false, east: false, south: false, west: true };
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), exit, this.roomSize));
            }
            for (let i = 0; i < this.doors.length; i++) {
                this.addChild(this.doors[i]);
            }
        }
        getRoomSize() {
            return this.roomSize;
        }
    }
    Generation.Room = Room;
    class Wall extends ƒ.Node {
        tag = Tag.TAG.WALL;
        collider;
        wallThickness = 3;
        constructor(_position, _width, _direction) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0);
            if (_direction.north) {
                this.cmpTransform.mtxLocal.translation.y += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.east) {
                this.cmpTransform.mtxLocal.translation.x += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.south) {
                this.cmpTransform.mtxLocal.translation.y -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.west) {
                this.cmpTransform.mtxLocal.translation.x -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
    }
    Generation.Wall = Wall;
    class Door extends ƒ.Node {
        tag = Tag.TAG.DOOR;
        collider;
        doorWidth = 3;
        doorThickness = 1;
        parentRoom;
        direction;
        constructor(_parent, _position, _direction, _roomSize) {
            super("Door");
            this.direction = _direction;
            this.parentRoom = _parent;
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));
            this.cmpTransform.mtxLocal.translation = _position.toVector3(0.01);
            if (_direction.north) {
                this.cmpTransform.mtxLocal.translation.y += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.east) {
                this.cmpTransform.mtxLocal.translation.x += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorThickness, this.doorWidth, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.south) {
                this.cmpTransform.mtxLocal.translation.y -= _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction.west) {
                this.cmpTransform.mtxLocal.translation.x -= _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorThickness, this.doorWidth, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
        changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.parentRoom, this.direction);
            }
            else {
                Networking.switchRoomRequest(this.parentRoom.coordinates, this.direction);
            }
        }
    }
    Generation.Door = Door;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 3;
    let usedPositions = [];
    Generation.rooms = [];
    //spawn chances
    let challengeRoomSpawnChance = 30;
    let treasureRoomSpawnChance = 100;
    function generateRooms() {
        let startCoords = Game.ƒ.Vector2.ZERO();
        Generation.rooms.push(new Generation.Room("roomStart", startCoords, calcPathExits(startCoords), Generation.ROOMTYPE.START));
        usedPositions.push(startCoords);
        for (let i = 0; i < numberOfRooms; i++) {
            addRoom(Generation.rooms[Generation.rooms.length - 1], Generation.ROOMTYPE.NORMAL);
        }
        addRoom(Generation.rooms[Generation.rooms.length - 1], Generation.ROOMTYPE.BOSS);
        addSpecialRooms();
        addRoom(Generation.rooms[Generation.rooms.length - 3], Generation.ROOMTYPE.MERCHANT);
        Generation.rooms.forEach(room => {
            room.exits = calcRoomDoors(room);
            // console.log(room.coordinates + " " + room.exits + " " + room.roomType.toString());
        });
        placeRoomsLocal(Generation.rooms[0]);
        for (let i = 0; i < Generation.rooms.length; i++) {
            Generation.rooms[i].setDoors();
            Generation.rooms[i].addWalls();
        }
        addRoomToGraph(Generation.rooms[0]);
        sendRoom({ coordinates: Generation.rooms[0].coordinates, direction: null, exits: Generation.rooms[0].exits, roomType: Generation.rooms[0].roomType, translation: Generation.rooms[0].mtxLocal.translation });
    }
    Generation.generateRooms = generateRooms;
    function placeRoomsLocal(_firstRoom) {
        if (_firstRoom.neighbourN != undefined && !_firstRoom.neighbourN.positionUpdated) {
            _firstRoom.neighbourN.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), _firstRoom.neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourN.roomSize / 2), -0.01);
            _firstRoom.neighbourN.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourN);
        }
        if (_firstRoom.neighbourE != undefined && !_firstRoom.neighbourE.positionUpdated) {
            _firstRoom.neighbourE.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), _firstRoom.neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourE.roomSize / 2), -0.01);
            _firstRoom.neighbourE.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourE);
        }
        if (_firstRoom.neighbourS != undefined && !_firstRoom.neighbourS.positionUpdated) {
            _firstRoom.neighbourS.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), _firstRoom.neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourS.roomSize / 2), -0.01);
            _firstRoom.neighbourS.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourS);
        }
        if (_firstRoom.neighbourW != undefined && !_firstRoom.neighbourW.positionUpdated) {
            _firstRoom.neighbourW.mtxLocal.translation = new ƒ.Vector3(_firstRoom.neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), _firstRoom.neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + _firstRoom.neighbourW.roomSize / 2), -0.01);
            _firstRoom.neighbourW.positionUpdated = true;
            placeRoomsLocal(_firstRoom.neighbourW);
        }
    }
    function sendRoom(_room) {
        Networking.sendRoom(_room);
    }
    function addRoom(_currentRoom, _roomType) {
        let numberOfExits = countBool(_currentRoom.exits);
        let randomNumber = Math.round(Math.random() * (numberOfExits - 1));
        let possibleExitIndex = getExitIndex(_currentRoom.exits);
        console.log(_roomType + ": " + possibleExitIndex + "____ " + randomNumber);
        let newRoomPosition;
        let newRoom;
        switch (possibleExitIndex[randomNumber]) {
            case 0: // north
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y + 1);
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourN = newRoom;
                newRoom.neighbourS = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x + 1, _currentRoom.coordinates.y);
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourE = newRoom;
                newRoom.neighbourW = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x, _currentRoom.coordinates.y - 1);
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourS = newRoom;
                newRoom.neighbourN = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = new Game.ƒ.Vector2(_currentRoom.coordinates.x - 1, _currentRoom.coordinates.y);
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourW = newRoom;
                newRoom.neighbourE = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
        }
        // _currentRoom.setRoomCoordinates();
    }
    function addSpecialRooms() {
        Generation.rooms.forEach(room => {
            room.exits = calcPathExits(room.coordinates);
            if (isSpawning(treasureRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.TREASURE);
                return;
            }
            if (isSpawning(challengeRoomSpawnChance)) {
                addRoom(room, Generation.ROOMTYPE.CHALLENGE);
                return;
            }
        });
    }
    function isSpawning(_spawnChance) {
        let x = Math.random() * 100;
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }
    function countBool(_exits) {
        let counter = 0;
        if (_exits.north) {
            counter++;
        }
        if (_exits.east) {
            counter++;
        }
        if (_exits.south) {
            counter++;
        }
        if (_exits.west) {
            counter++;
        }
        return counter;
    }
    function getExitIndex(_exits) {
        let numbers = [];
        if (_exits.north) {
            numbers.push(0);
        }
        if (_exits.east) {
            numbers.push(1);
        }
        if (_exits.west) {
            numbers.push(2);
        }
        if (_exits.south) {
            numbers.push(3);
        }
        return numbers;
    }
    /**
     * calculates possible exits for new rooms
     * @param _position position of room
     * @returns boolean for each direction north, east, south, west
     */
    function calcPathExits(_position) {
        let exits = { north: false, east: false, south: false, west: false };
        let roomNeighbours;
        roomNeighbours = sliceNeighbours(getNeighbours(_position));
        for (let i = 0; i < roomNeighbours.length; i++) {
            if (roomNeighbours[i].y - _position.y == -1) {
                exits.south = true;
            }
            if (roomNeighbours[i].x - _position.x == -1) {
                exits.west = true;
            }
            if (roomNeighbours[i].y - _position.y == 1) {
                exits.north = true;
            }
            if (roomNeighbours[i].x - _position.x == 1) {
                exits.east = true;
            }
        }
        return exits;
    }
    function calcRoomDoors(_room) {
        let exits = { north: false, east: false, south: false, west: false };
        if (_room.neighbourN != undefined) {
            exits.north = true;
        }
        if (_room.neighbourE != undefined) {
            exits.east = true;
        }
        if (_room.neighbourS != undefined) {
            exits.south = true;
        }
        if (_room.neighbourW != undefined) {
            exits.west = true;
        }
        return exits;
    }
    function getNeighbours(_position) {
        let neighbours = [];
        neighbours.push(new Game.ƒ.Vector2(_position.x, _position.y - 1)); // down
        neighbours.push(new Game.ƒ.Vector2(_position.x - 1, _position.y)); // left
        neighbours.push(new Game.ƒ.Vector2(_position.x, _position.y + 1)); // up
        neighbours.push(new Game.ƒ.Vector2(_position.x + 1, _position.y)); // right
        return neighbours;
    }
    function sliceNeighbours(_neighbours) {
        let neighbours = _neighbours;
        let toRemoveIndex = [];
        for (let i = 0; i < neighbours.length; i++) {
            // check ich position already used
            usedPositions.forEach(room => {
                if (neighbours[i].x == room.x && neighbours[i].y == room.y) {
                    toRemoveIndex.push(i);
                }
            });
        }
        let copy = [];
        toRemoveIndex.forEach(index => {
            delete neighbours[index];
        });
        neighbours.forEach(n => {
            copy.push(n);
        });
        return copy;
    }
    function switchRoom(_currentRoom, _direction) {
        if (_currentRoom.finished) {
            if (_direction.north) {
                let exits = { north: false, east: false, south: true, west: false };
                sendRoom({ coordinates: _currentRoom.neighbourN.coordinates, direction: exits, exits: _currentRoom.neighbourN.exits, roomType: _currentRoom.neighbourN.roomType, translation: _currentRoom.neighbourN.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourN, exits);
            }
            if (_direction.east) {
                let exits = { north: false, east: false, south: false, west: true };
                sendRoom({ coordinates: _currentRoom.neighbourE.coordinates, direction: exits, exits: _currentRoom.neighbourE.exits, roomType: _currentRoom.neighbourE.roomType, translation: _currentRoom.neighbourE.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourE, exits);
            }
            if (_direction.south) {
                let exits = { north: true, east: false, south: false, west: false };
                sendRoom({ coordinates: _currentRoom.neighbourS.coordinates, direction: exits, exits: _currentRoom.neighbourS.exits, roomType: _currentRoom.neighbourS.roomType, translation: _currentRoom.neighbourS.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourS, exits);
            }
            if (_direction.west) {
                let exits = { north: false, east: true, south: false, west: false };
                sendRoom({ coordinates: _currentRoom.neighbourW.coordinates, direction: exits, exits: _currentRoom.neighbourW.exits, roomType: _currentRoom.neighbourW.roomType, translation: _currentRoom.neighbourW.mtxLocal.translation });
                addRoomToGraph(_currentRoom.neighbourW, exits);
            }
            EnemySpawner.spawnEnemies();
        }
    }
    Generation.switchRoom = switchRoom;
    function addRoomToGraph(_room, _direciton) {
        let oldObjects = Game.graph.getChildren().filter(elem => elem.tag != Tag.TAG.PLAYER);
        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });
        Game.graph.addChild(_room);
        Game.graph.addChild(_room.walls[0]);
        Game.graph.addChild(_room.walls[1]);
        Game.graph.addChild(_room.walls[2]);
        Game.graph.addChild(_room.walls[3]);
        if (_direciton != undefined) {
            let newPosition = _room.cmpTransform.mtxLocal.translation.clone;
            if (_direciton != null) {
                if (_direciton.north) {
                    newPosition.y += _room.roomSize / 2 - 2;
                }
                if (_direciton.east) {
                    newPosition.x += _room.roomSize / 2 - 2;
                }
                if (_direciton.south) {
                    newPosition.y -= _room.roomSize / 2 - 2;
                }
                if (_direciton.west) {
                    newPosition.x -= _room.roomSize / 2 - 2;
                }
            }
            newPosition.z = 0;
            Game.avatar1.cmpTransform.mtxLocal.translation = newPosition;
            if (Networking.client.id == Networking.client.idHost) {
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition;
            }
        }
        if (Networking.client.id != Networking.client.idHost) {
            _room.setDoors();
        }
        for (let i = 0; i < _room.doors.length; i++) {
            Game.graph.addChild(_room.doors[i]);
        }
        if (_room.roomType == Generation.ROOMTYPE.TREASURE && Networking.client.id == Networking.client.idHost) {
            //TODO: add ExternalItems random
            let position = _room.mtxLocal.translation.toVector2();
            position.x -= 2;
            let randomItemId = Math.floor(Math.random() * (Object.keys(Items.ITEMID).length / 2 - 1));
            Game.graph.addChild(new Items.InternalItem(randomItemId, position));
            position.x += 4;
            randomItemId = Math.floor(Math.random() * (Object.keys(Items.ITEMID).length / 2 - 1));
            Game.graph.addChild(new Items.InternalItem(randomItemId, position));
        }
    }
    Generation.addRoomToGraph = addRoomToGraph;
})(Generation || (Generation = {}));
var Tag;
(function (Tag) {
    let TAG;
    (function (TAG) {
        TAG[TAG["PLAYER"] = 0] = "PLAYER";
        TAG[TAG["ENEMY"] = 1] = "ENEMY";
        TAG[TAG["BULLET"] = 2] = "BULLET";
        TAG[TAG["ITEM"] = 3] = "ITEM";
        TAG[TAG["ROOM"] = 4] = "ROOM";
        TAG[TAG["WALL"] = 5] = "WALL";
        TAG[TAG["DOOR"] = 6] = "DOOR";
        TAG[TAG["DAMAGEUI"] = 7] = "DAMAGEUI";
    })(TAG = Tag.TAG || (Tag.TAG = {}));
})(Tag || (Tag = {}));
var Weapons;
(function (Weapons) {
    class Weapon {
        owner;
        get _owner() { return Game.entities.find(elem => elem.netId == this.owner); }
        ;
        cooldown;
        cooldownTime;
        attackCount = 1;
        currentAttackCount = this.attackCount;
        aimType;
        bulletType = Bullets.BULLETTYPE.STANDARD;
        projectileAmount = 1;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, _aimType) {
            this.cooldownTime = _cooldownTime;
            this.attackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.owner = _ownerNetId;
            this.aimType = _aimType;
            this.cooldown = new Ability.Cooldown(this.cooldownTime);
        }
        shoot(_position, _direciton, _bulletNetId, _sync) {
            if (_sync) {
                if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                    this.currentAttackCount = this.attackCount;
                }
                if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {
                    _direciton.normalize();
                    let magazine = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                    this.setBulletDirection(magazine);
                    this.fire(magazine, _sync);
                    this.currentAttackCount--;
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.cooldown = new Ability.Cooldown(this._owner.attributes.coolDownReduction * this.cooldownTime);
                        this.cooldown.startCoolDown();
                    }
                }
            }
            else {
                _direciton.normalize();
                let magazine = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                this.setBulletDirection(magazine);
                this.fire(magazine, _sync);
            }
        }
        fire(_magazine, _sync) {
            _magazine.forEach(bullet => {
                Game.graph.addChild(bullet);
                if (_sync) {
                    if (bullet instanceof Bullets.HomingBullet) {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.owner, bullet.target);
                    }
                    else {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.owner);
                    }
                }
            });
        }
        setBulletDirection(_magazine) {
            switch (_magazine.length) {
                case 1:
                    return _magazine;
                case 2:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                    return _magazine;
                case 3:
                    _magazine[0].mtxLocal.rotateZ(45 / 2);
                    _magazine[1].mtxLocal.rotateZ(45 / 2 * -1);
                default:
                    return _magazine;
            }
        }
        loadMagazine(_position, _direction, _bulletType, _netId) {
            let magazine = [];
            for (let i = 0; i < this.projectileAmount; i++) {
                const ref = Game.bulletsJSON.find(bullet => bullet.type == _bulletType);
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.Bullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, _position, _direction, this.owner, _netId));
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(ref.name, ref.speed, ref.hitPointsScale, ref.lifetime, ref.knockbackForce, ref.killcount, _position, _direction, this.owner, null, _netId));
                        break;
                }
            }
            return magazine;
        }
        getBulletByBulletType(_type) {
            const ref = Game.bulletsJSON.find(bullet => bullet.type == _type);
        }
    }
    Weapons.Weapon = Weapon;
    let AIM;
    (function (AIM) {
        AIM[AIM["NORMAL"] = 0] = "NORMAL";
        AIM[AIM["HOMING"] = 1] = "HOMING";
    })(AIM = Weapons.AIM || (Weapons.AIM = {}));
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL0VudGl0eS50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0ludGVyZmFjZXMudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BbmltYXRpb25HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9QcmVkaWN0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9BYmlsaXR5LnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9Cb3NzLnRzIiwiLi4vQ2xhc3Nlcy9CdWZmLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NvbGxpZGVyLnRzIiwiLi4vQ2xhc3Nlcy9FbmVteVNwYXduZXIudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvVGFnLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBZ1piO0FBclpELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDVixJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDbEIsaURBQU8sQ0FBQTtRQUNQLDZDQUFLLENBQUE7SUFDVCxDQUFDLEVBSFcs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T0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOVEsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEdBQUcsSUFBSSxDQUFDO1lBQzdDLGVBQWUsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDMUM7UUFDRCxJQUFJLFVBQVUsQ0FBQyxVQUFVLElBQUksU0FBUyxJQUFJLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7WUFDOUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDO1lBQzlRLFVBQVUsQ0FBQyxVQUFVLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUM3QyxlQUFlLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDO1NBQzFDO1FBQ0QsSUFBSSxVQUFVLENBQUMsVUFBVSxJQUFJLFNBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQzlFLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUM5USxVQUFVLENBQUMsVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDN0MsZUFBZSxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUMxQztRQUNELElBQUksVUFBVSxDQUFDLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLGVBQWUsRUFBRTtZQUM5RSxVQUFVLENBQUMsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDOVEsVUFBVSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEdB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QUFFLEdBQUcsQ0FBQyxLQUFLLEVBQUUsR0FBRyxDQUFDLGNBQWMsRUFBRSxHQUFHLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxjQUFjLEVBQUUsR0FBRyxDQUFDLFNBQVMsRUFBRSxTQUFTLEVBQUUsVUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFDLENBQUM7d0JBQ25MLE1BQU07aUJBQ2I7YUFDSjtZQUNELE9BQU8sUUFBUSxDQUFDO1FBQ3BCLENBQUM7UUFFRCxxQkFBcUIsQ0FBQyxLQUF5QjtZQUMzQyxNQUFNLEdBQUcsR0FBRyxJQUFJLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksS0FBSyxDQUFDLENBQUE7UUFHckUsQ0FBQztLQUNKO0lBbEdZLGNBQU0sU0FrR2xCLENBQUE7SUFFRCxJQUFZLEdBR1g7SUFIRCxXQUFZLEdBQUc7UUFDWCxpQ0FBTSxDQUFBO1FBQ04saUNBQU0sQ0FBQTtJQUNWLENBQUMsRUFIVyxHQUFHLEdBQUgsV0FBRyxLQUFILFdBQUcsUUFHZDtBQUVMLENBQUMsRUExR1MsT0FBTyxLQUFQLE9BQU8sUUEwR2hCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcblxyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBkZWx0YVRpbWU6IG51bWJlcjtcclxuXHJcbiAgICBleHBvcnQgbGV0IHNlcnZlclByZWRpY3Rpb25BdmF0YXI6IE5ldHdvcmtpbmcuU2VydmVyUHJlZGljdGlvbjtcclxuXHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnROZXRPYmo6IEludGVyZmFjZXMuTmV0d29ya09iamVjdHM7XHJcblxyXG4gICAgZXhwb3J0IGxldCBlbnRpdGllczogRW50aXR5LkVudGl0eVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGVuZW1pZXM6IEVuZW15LkVuZW15W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBpdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcblxyXG4gICAgZXhwb3J0IGxldCBjb29sRG93bnM6IEFiaWxpdHkuQ29vbGRvd25bXSA9IFtdO1xyXG4gICAgLy9KU09OXHJcbiAgICBleHBvcnQgbGV0IGVuZW1pZXNKU09OOiBFbnRpdHkuRW50aXR5W107XHJcbiAgICBleHBvcnQgbGV0IGludGVybmFsSXRlbUpTT046IEl0ZW1zLkludGVybmFsSXRlbVtdO1xyXG4gICAgZXhwb3J0IGxldCBidWZmSXRlbUpTT046IEl0ZW1zLkJ1ZmZJdGVtW107XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzSlNPTjogQnVsbGV0cy5CdWxsZXRbXTtcclxuICAgIGV4cG9ydCBsZXQgbG9hZGVkID0gZmFsc2U7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG5cclxuICAgIC8vI3JlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG4gICAgY29uc3QgZGFtcGVyOiBudW1iZXIgPSAzLjU7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBcImVzc2VudGlhbFwiXHJcbiAgICBhc3luYyBmdW5jdGlvbiBpbml0KCkge1xyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIEdlbmVyYXRpb24uZ2VuZXJhdGVSb29tcygpO1xyXG4gICAgICAgICAgICBzZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyID0gbmV3IE5ldHdvcmtpbmcuU2VydmVyUHJlZGljdGlvbihudWxsKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGF2YXRhcjEpO1xyXG5cclxuICAgICAgICDGkkFpZC5hZGRTdGFuZGFyZExpZ2h0Q29tcG9uZW50cyhncmFwaCk7XHJcblxyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGVaKDI1KTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3Qucm90YXRlWSgxODApO1xyXG5cclxuICAgICAgICB2aWV3cG9ydC5pbml0aWFsaXplKFwiVmlld3BvcnRcIiwgZ3JhcGgsIGNtcENhbWVyYSwgY2FudmFzKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgZGVsdGFUaW1lID0gR2FtZS7Gki5Mb29wLnRpbWVGcmFtZUdhbWUgKiAwLjAwMTtcclxuICAgICAgICBwYXVzZUNoZWNrKCk7XHJcblxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5wcmVkaWN0KCk7XHJcblxyXG5cclxuICAgICAgICBjYW1lcmFVcGRhdGUoKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhclBvc2l0aW9uKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICAgICAgc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGl0ZW1zID0gPEl0ZW1zLkl0ZW1bXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8SXRlbXMuSXRlbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5JVEVNKVxyXG4gICAgICAgIC8vIGNvb2xEb3ducy5mb3JFYWNoKF9jZCA9PiB7XHJcbiAgICAgICAgLy8gICAgIF9jZC51cGRhdGVDb29sRG93bigpO1xyXG4gICAgICAgIC8vIH0pXHJcblxyXG4gICAgICAgIGJ1bGxldHMgPSA8QnVsbGV0cy5CdWxsZXRbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8QnVsbGV0cy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuQlVMTEVUKVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBidWxsZXRzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnByZWRpY3QoKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIGxldCBkYW1hZ2VVSTogVUkuRGFtYWdlVUlbXSA9IDxVSS5EYW1hZ2VVSVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxVSS5EYW1hZ2VVST5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5EQU1BR0VVSSlcclxuICAgICAgICAvLyBkYW1hZ2VVSS5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgIC8vICAgICBlbGVtZW50Lm1vdmUoKTtcclxuICAgICAgICAvLyAgICAgZWxlbWVudC5saWZlc3BhbihncmFwaCk7XHJcbiAgICAgICAgLy8gfSlcclxuXHJcbiAgICAgICAgZW50aXRpZXMgPSA8RW50aXR5LkVudGl0eVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGNoaWxkID0+ICg8RW50aXR5LkVudGl0eT5jaGlsZCkgaW5zdGFuY2VvZiBFbnRpdHkuRW50aXR5KTtcclxuICAgICAgICAvLyBlbnRpdGllcy5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgIC8vICAgICBlbGVtZW50LnVwZGF0ZUJ1ZmZzKCk7XHJcbiAgICAgICAgLy8gICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAvLyAgICAgICAgIGVsZW1lbnQudXBkYXRlKCk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAvLyB9KVxyXG5cclxuICAgICAgICBlbmVtaWVzID0gPEVuZW15LkVuZW15W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKVxyXG5cclxuICAgICAgICBjdXJyZW50Um9vbSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW0gPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbSkudGFnID09IFRhZy5UQUcuUk9PTSkpO1xyXG5cclxuXHJcbiAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuc29ja2V0LnJlYWR5U3RhdGUgPT0gTmV0d29ya2luZy5jbGllbnQuc29ja2V0Lk9QRU4pIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyBzZXRDbGllbnQoKSB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkeVNhdGUoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50UmVhZHkoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgcmVhZHlTYXRlKCkgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnRMb29wKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5sb2FkZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEdhbWUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZGVsdGFUaW1lKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0TG9vcCgpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcclxuICAgICAgICBsb2FkVGV4dHVyZXMoKTtcclxuICAgICAgICBsb2FkSlNPTigpO1xyXG5cclxuICAgICAgICAvL1RPRE86IGFkZCBzcHJpdGUgdG8gZ3JhcGhlIGZvciBzdGFydHNjcmVlblxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRHYW1lXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmNvbm5lY3RpbmcoKTtcclxuXHJcbiAgICAgICAgICAgIHdhaXRPbkNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNldENsaWVudCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5maWx0ZXIoZWxlbSA9PiBlbGVtLnJlYWR5ID09IHRydWUpLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSU1IT1NUXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGluaXQoKTtcclxuICAgICAgICAgICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduRW5lbWllcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUiwgRW50aXR5LklELlNVTU1PTk9SLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaXRlbTEgPSBuZXcgSXRlbXMuQnVmZkl0ZW0oSXRlbXMuSVRFTUlELlRPWElDUkVMQVRJT05TSElQLCBuZXcgxpIuVmVjdG9yMigwLCAyKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtMiA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlBST0pFQ1RJTEVTVVAsIG5ldyDGki5WZWN0b3IyKDAsIC0yKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtMyA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELkhPTUVDT01JTkcsIG5ldyDGki5WZWN0b3IyKC0yLCAwKSwgbnVsbCk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTEpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChpdGVtMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0zKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25QbGF5ZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRMb29wKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgTmV0d29ya2luZy5zZXRIb3N0KTtcclxuXHJcbiAgICAgICAgICAgIHdhaXRGb3JIb3N0KCk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhaXRGb3JIb3N0KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckhvc3QoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB3YWl0Rm9yTG9iYnkoKTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckxvYmJ5KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPiAxICYmIE5ldHdvcmtpbmcuY2xpZW50LnBlZXJzW05ldHdvcmtpbmcuY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkuaWRdICE9IHVuZGVmaW5lZCAmJlxyXG4gICAgICAgICAgICAgICAgICAgIChOZXR3b3JraW5nLmNsaWVudC5wZWVyc1tOZXR3b3JraW5nLmNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpLmlkXS5kYXRhQ2hhbm5lbCAhPSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgKE5ldHdvcmtpbmcuY2xpZW50LnBlZXJzW05ldHdvcmtpbmcuY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkuaWRdLmRhdGFDaGFubmVsLnJlYWR5U3RhdGUgPT0gXCJvcGVuXCIpKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja0NyZWRpdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwbGF5ZXJDaG9pY2UoX2U6IEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIlJhbmdlZFwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLlJhbmdlZChFbnRpdHkuSUQuUkFOR0VELCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDUsIDUsIDEsIDIsIDUpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIk1lbGVlXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDEsIDUsIDEsIDIsIDEwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgcmVhZHlTYXRlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhdXNlQ2hlY2soKSB7XHJcbiAgICAgICAgaWYgKCh3aW5kb3cuc2NyZWVuWCA8IC13aW5kb3cuc2NyZWVuLmF2YWlsV2lkdGgpICYmICh3aW5kb3cuc2NyZWVuWSA8IC13aW5kb3cuc2NyZWVuLmF2YWlsSGVpZ2h0KSkge1xyXG4gICAgICAgICAgICBwYXVzZSh0cnVlLCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHBhdXNlQ2hlY2soKTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwbGF5aW5nKHRydWUsIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBhdXNlKF9zeW5jOiBib29sZWFuLCBfdHJpZ2dlck9wdGlvbjogYm9vbGVhbikge1xyXG4gICAgICAgIGlmIChnYW1lc3RhdGUgPT0gR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUoZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGlmIChfdHJpZ2dlck9wdGlvbikge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBiYWNrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJhY2tDbG9uZSA9IGJhY2suY2xvbmVOb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGJhY2sucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoYmFja0Nsb25lLCBiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUEFVU0U7XHJcbiAgICAgICAgICAgIMaSLkxvb3Auc3RvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcGxheWluZyhfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUEFVU0UpIHtcclxuICAgICAgICAgICAgaWYgKF9zeW5jKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNldEdhbWVzdGF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgxpIuTG9vcC5jb250aW51ZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkSlNPTigpIHtcclxuICAgICAgICBjb25zdCBsb2FkRW5lbXkgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9FbmVtaWVzU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZW5lbWllc0pTT04gPSAoPEVudGl0eS5FbnRpdHlbXT5sb2FkRW5lbXkuZW5lbWllcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRJdGVtID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvSXRlbVN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGludGVybmFsSXRlbUpTT04gPSAoPEl0ZW1zLkludGVybmFsSXRlbVtdPmxvYWRJdGVtLmludGVybmFsSXRlbXMpO1xyXG4gICAgICAgIGJ1ZmZJdGVtSlNPTiA9ICg8SXRlbXMuQnVmZkl0ZW1bXT5sb2FkSXRlbS5idWZmSXRlbXMpO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3QgbG9hZEJ1bGxldHMgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9CdWxsZXRTdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBidWxsZXRzSlNPTiA9ICg8QnVsbGV0cy5CdWxsZXRbXT5sb2FkQnVsbGV0cy5zdGFuZGFyZEJ1bGxldHMpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRleHR1cmVzKCkge1xyXG4gICAgICAgIGF3YWl0IEdlbmVyYXRpb24udHh0U3RhcnRSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Sb29tcy9tYXAwMS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMuYnVsbGV0VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9hcnJvdzAxLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9VSVxyXG4gICAgICAgIGF3YWl0IFVJLnR4dFplcm8ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0T25lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTEucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUyLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUaHJlZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUzLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGb3VyLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZpdmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlNS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2l4LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTYucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNldmVuLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEVpZ2h0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTgucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE5pbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlOS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGVuLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTEwLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9VSSBwYXJ0aWNsZVxyXG4gICAgICAgIGF3YWl0IFVJLmhlYWxQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL2hlYWxpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnBvaXNvblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5idXJuUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9wb2lzb24ucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmJsZWVkaW5nUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9ibGVlZGluZy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuc2xvd1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvc2xvdy5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICAvL0VORU1ZXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRCYXRJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL2JhdC9iYXRJZGxlLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFJlZFRpY2tXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3RpY2svcmVkVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja0lkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U21hbGxUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zbWFsbFRpY2svc21hbGxUaWNrV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25JZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTa2VsZXRvbldhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc2tlbGV0b24vc2tlbGV0b25XYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlcldhbGsucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlckF0dGFjay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJBdHRhY2sucG5nXCIpO1xyXG5cclxuXHJcblxyXG4gICAgICAgIC8vSXRlbXNcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRJY2VCdWNrZXQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2ljZUJ1Y2tldC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SGVhbHRoVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2hlYWx0aFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRUb3hpY1JlbGF0aW9uc2hpcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvdG94aWNSZWxhdGlvbnNoaXAucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgQW5pbWF0aW9uR2VuZXJhdGlvbi5nZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShkZWx0YVRpbWUgKiBkYW1wZXIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShhdmF0YXIxLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogZGFtcGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMygtZGlyZWN0aW9uLngsIGRpcmVjdGlvbi55LCAwKSwgdHJ1ZSk7XHJcbiAgICB9XHJcblxyXG4gICAgxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKMaSLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG5cclxufVxyXG4iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBleHNpc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjLnNwbGl0KFwiL1wiKS5maW5kKGVsZW0gPT4gZWxlbSA9PSBpbWdOYW1lW2ltZ05hbWUubGVuZ3RoIC0gMV0pICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgIGlmICghZXhzaXN0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgcGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcblxyXG4gICAgICAgIC8vQXZhdGFyMiBVSVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuaW1nU3JjID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vc2VhcmNoIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChpbWdFbGVtZW50LnNyYy5zcGxpdChcIi9cIikuZmluZChlbGVtID0+IGVsZW0gPT0gaW1nTmFtZVtpbWdOYW1lLmxlbmd0aCAtIDFdKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBIVE1MSW1hZ2VFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImltZ1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgICAgIHBsYXllcjJVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0WmVybzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VG93OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRocmVlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZvdXI6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rml2ZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTaXg6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2V2ZW46IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RWlnaHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0TmluZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUZW46IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRGFtYWdlVUkgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5EQU1BR0VVSTtcclxuICAgICAgICB1cDogbnVtYmVyID0gMC4xNTtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMC41ICogNjA7XHJcbiAgICAgICAgcmFuZG9tWDogbnVtYmVyID0gTWF0aC5yYW5kb20oKSAqIDAuMDUgLSBNYXRoLnJhbmRvbSgpICogMC4wNTtcclxuICAgICAgICBhc3luYyBsaWZlc3BhbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZShfZGFtYWdlKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLnVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmUoKTtcclxuICAgICAgICAgICAgdGhpcy5saWZlc3BhbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbW92ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKHRoaXMucmFuZG9tWCwgdGhpcy51cCwgMCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZSjGki5WZWN0b3IzLk9ORSgxLjAxKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBsb2FkVGV4dHVyZShfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKE1hdGguYWJzKF9kYW1hZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0WmVybztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRPbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VG93O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRocmVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZvdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rml2ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRTZXZlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgODpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgOTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHROaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGFtYWdlID49IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJyZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwID0gMC4xO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBoZWFsUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcG9pc29uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgYnVyblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJsZWVkaW5nUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgc2xvd1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUGFydGljbGVzIGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIHtcclxuICAgICAgICBpZDogQnVmZi5CVUZGSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uUGFydGljbGVzOiBHYW1lLsaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVOdW1iZXI6IG51bWJlcjtcclxuICAgICAgICBwYXJ0aWNsZWZyYW1lUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIHdpZHRoOiBudW1iZXI7XHJcbiAgICAgICAgaGVpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCdWZmLkJVRkZJRCwgX3RleHR1cmU6IEdhbWUuxpIuVGV4dHVyZUltYWdlLCBfZnJhbWVDb3VudDogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoZ2V0TmFtZUJ5SWQoX2lkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVmcmFtZU51bWJlciA9IF9mcmFtZUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVSYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25QYXJ0aWNsZXMgPSBuZXcgR2FtZS7GkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbihnZXROYW1lQnlJZCh0aGlzLmlkKSwgbmV3IMaSLkNvYXRUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgX3RleHR1cmUpKVxyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IF90ZXh0dXJlLmltYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgdGhpcy53aWR0aCA9IF90ZXh0dXJlLmltYWdlLndpZHRoIC8gdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25QYXJ0aWNsZXMuZ2VuZXJhdGVCeUdyaWQoxpIuUmVjdGFuZ2xlLkdFVCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCksIHRoaXMucGFydGljbGVmcmFtZU51bWJlciwgMzIsIMaSLk9SSUdJTjJELkNFTlRFUiwgxpIuVmVjdG9yMi5YKHRoaXMud2lkdGgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24odGhpcy5hbmltYXRpb25QYXJ0aWNsZXMpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlWigwLjAwMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGdldE5hbWVCeUlkKF9pZDogQnVmZi5CVUZGSUQpOiBzdHJpbmcge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuQkxFRURJTkc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJibGVlZGluZ1wiO1xyXG4gICAgICAgICAgICBjYXNlIEJ1ZmYuQlVGRklELlBPSVNPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInBvaXNvblwiO1xyXG4gICAgICAgICAgICBjYXNlIEJ1ZmYuQlVGRklELkhFQUw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJoZWFsXCI7XHJcbiAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuU0xPVzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNsb3dcIjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbnRpdHkge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbnRpdHkgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEFuaW1hdGlvblN0YXRlOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHJpdmF0ZSBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlcztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbjtcclxuICAgICAgICBwdWJsaWMgYnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgcHJvdGVjdGVkIGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwcm90ZWN0ZWQgY2FuTW92ZVk6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByb3RlY3RlZCBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIHByb3RlY3RlZCBhbmltYXRpb25Db250YWluZXI6IEFuaW1hdGlvbkdlbmVyYXRpb24uQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBpZGxlU2NhbGU6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudEtub2NrYmFjazogxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogQXR0cmlidXRlcywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoZ2V0TmFtZUJ5SWQoX2lkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyh0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKDxJbnRlcmZhY2VzLk5ldHdvcmtPYmplY3RzPnsgbmV0SWQ6IF9uZXRJZCwgbmV0T2JqZWN0Tm9kZTogdGhpcyB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcih0aGlzKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyID0gYW5pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuc2NhbGUuZmluZChhbmltYXRpb24gPT4gYW5pbWF0aW9uWzBdID09IFwiaWRsZVwiKVsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQnVmZnMoKTtcclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZUJ1ZmZzKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZmcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWZmcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJ1ZmZzW2ldLmRvQnVmZlN0dWZmKHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5idWZmcy5zcGxpY2UoaSwgMSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KHRoaXMuYnVmZnMsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGxldCB3YWxsQ29sbGlkZXJzOiBHYW1lLsaSLlJlY3RhbmdsZVtdID0gW107XHJcbiAgICAgICAgICAgIHdhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB3YWxsQ29sbGlkZXJzLnB1c2goZWxlbS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGxldCBtZXdEaXJlY3Rpb24gPSBfZGlyZWN0aW9uLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoIW1ld0RpcmVjdGlvbi5lcXVhbHMoR2FtZS7Gki5WZWN0b3IzLlpFUk8oKSkpIHtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNvbGxpZGVyKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQ29sbGlkZXIoX2NvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcltdIHwgR2FtZS7Gki5SZWN0YW5nbGVbXSwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfY29sbGlkZXIuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBDb2xsaWRlci5Db2xsaWRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgdGhpcy5jb2xsaWRlci5yYWRpdXMgKyBlbGVtZW50LnJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIxLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmdldEtub2NrYmFjayh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQub3duZXJOZXRJZCA9PSBHYW1lLmF2YXRhcjIubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmtub2NrYmFja1B1c2godGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBHYW1lLsaSLlJlY3RhbmdsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBpbnRlcnNlY3Rpb24uaGVpZ2h0ICogaW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3ZhbHVlICE9IG51bGwgJiYgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaGl0VmFsdWUgPSB0aGlzLmdldERhbWFnZVJlZHVjdGlvbihfdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gaGl0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZVVJKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIE1hdGgucm91bmQoaGl0VmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVFbmVteSh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGllKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRpZSgpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RGFtYWdlUmVkdWN0aW9uKF92YWx1ZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIF92YWx1ZSAqICgxIC0gKHRoaXMuYXR0cmlidXRlcy5hcm1vciAvIDEwMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNyZWdpb24ga25vY2tiYWNrXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBlcmZvcm1Lbm9ja2JhY2spIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX3Bvc2l0aW9uLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoMCk7XHJcbiAgICAgICAgICAgICAgICBsZXQga25vY2tCYWNrU2NhbGluZzogbnVtYmVyID0gR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc2NhbGU7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShfa25vY2tiYWNrRm9yY2UgKiAoMSAvIGtub2NrQmFja1NjYWxpbmcpKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRLbm9ja2JhY2suYWRkKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyByZWR1Y2VLbm9ja2JhY2soKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5zY2FsZSgwLjUpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmN1cnJlbnRLbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUgPCAwLjAwMDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjayA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBlcmZvcm1Lbm9ja2JhY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgc3dpdGNoQW5pbWF0aW9uKF9uYW1lOiBBTklNQVRJT05TVEFURVMpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBpZiBhbmltYXRpb24gZG9lc250IGV4aXN0IGRvbnQgc3dpdGNoXHJcbiAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSBBTklNQVRJT05TVEFURVNbX25hbWVdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciAhPSBudWxsICYmIDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSAhPSBfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX25hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLldBTEs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLkFUVEFDSztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5mcmFtZVJhdGUuZmluZChvYmogPT4gb2JqWzBdID09IG5hbWUpWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBbmltYXRpb25TdGF0ZSh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLndhcm4oXCJubyBhbmltYXRpb25Db250YWluZXIgb3IgYW5pbWF0aW9uIHdpdGggbmFtZTogXCIgKyBuYW1lICsgXCIgYXQgRW50aXR5OiBcIiArIHRoaXMubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBlbnVtIEFOSU1BVElPTlNUQVRFUyB7XHJcbiAgICAgICAgSURMRSwgV0FMSywgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBCRUhBVklPVVIge1xyXG4gICAgICAgIElETEUsIEZPTExPVywgRkxFRSwgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBJRCB7XHJcbiAgICAgICAgUkFOR0VEID0gXCJyYW5nZWRcIixcclxuICAgICAgICBNRUxFRSA9IFwibWVsZWVcIixcclxuICAgICAgICBCQVQgPSBcImJhdFwiLFxyXG4gICAgICAgIFJFRFRJQ0sgPSBcInJlZHRpY2tcIixcclxuICAgICAgICBTTUFMTFRJQ0sgPSBcInNtYWxsdGlja1wiLFxyXG4gICAgICAgIFNLRUxFVE9OID0gXCJza2VsZXRvblwiLFxyXG4gICAgICAgIE9HRVIgPSBcIm9nZXJcIixcclxuICAgICAgICBTVU1NT05PUiA9IFwic3VtbW9ub3JcIlxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROYW1lQnlJZChfaWQ6IEVudGl0eS5JRCk6IHN0cmluZyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBJRC5SQU5HRUQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJyYW5nZWRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5NRUxFRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInRhbmtcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJiYXRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNtYWxsVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic2tlbGV0b25cIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2dlclwiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic3VtbW9ub3JcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEVORU1ZQ0xBU1Mge1xyXG4gICAgICAgIEVORU1ZRFVNQixcclxuICAgICAgICBFTkVNWURBU0gsXHJcbiAgICAgICAgRU5FTVlTTUFTSCxcclxuICAgICAgICBFTkVNWVBBVFJPTCxcclxuICAgICAgICBFTkVNWVNIT09ULFxyXG4gICAgICAgIFNVTU1PTk9SLFxyXG4gICAgICAgIFNVTU1PTk9SQUREU1xyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSO1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMjtcclxuICAgICAgICBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gX2F0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5FTkVNWTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksICh0aGlzLm10eExvY2FsLnNjYWxpbmcueCAqIHRoaXMuaWRsZVNjYWxlKSAvIDIsIHRoaXMubmV0SWQpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZUJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15UG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbilcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24uc3VidHJhY3QoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG1vdmVTaW1wbGUoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQXdheShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBtb3ZlU2ltcGxlID0gdGhpcy5tb3ZlU2ltcGxlKF90YXJnZXQpO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnggKj0gLTE7XHJcbiAgICAgICAgICAgIG1vdmVTaW1wbGUueSAqPSAtMTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmVTaW1wbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkaWUoKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGtub2NrYmFjayA9IHRoaXMuY3VycmVudEtub2NrYmFjay5jbG9uZTtcclxuICAgICAgICAgICAgaWYgKGtub2NrYmFjay5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBfZGlyZWN0aW9uLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uYWRkKGtub2NrYmFjayk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgICAgICBrbm9ja2JhY2suc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIHN1cGVyLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGF2YXRhcjogUGxheWVyLlBsYXllcltdID0gKDxQbGF5ZXIuUGxheWVyW10+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpKTtcclxuICAgICAgICAgICAgICAgIGxldCBhdmF0YXJDb2xsaWRlcnM6IENvbGxpZGVyLkNvbGxpZGVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGF2YXRhci5mb3JFYWNoKChlbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyQ29sbGlkZXJzLnB1c2goKDxQbGF5ZXIuUGxheWVyPmVsZW0pLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlkZXIoYXZhdGFyQ29sbGlkZXJzLCBfZGlyZWN0aW9uKVxyXG5cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2RpcmVjdGlvbi54LCAwLCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIF9kaXJlY3Rpb24ueSwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc3VidHJhY3Qoa25vY2tiYWNrKTtcclxuICAgICAgICAgICAgICAgIGlmIChrbm9ja2JhY2subWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwia25vY2tiYWNrOiBcIiArIGtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGlyZWN0aW9uOiBcIiArIF9kaXJlY3Rpb24ubWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5yZWR1Y2VLbm9ja2JhY2soKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUR1bWIgZXh0ZW5kcyBFbmVteSB7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRhcmdldCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgLy9UT0RPOiBzZXQgdG8gMyBhZnRlciB0ZXN0aW5nXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDIpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIC8vIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uc1tcImlkbGVcIl0pO1xyXG4gICAgICAgICAgICAgICAgLy8gICAgIC8vIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTbWFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBpc0F0dGFja2luZyA9IGZhbHNlO1xyXG4gICAgICAgIGNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNTAgKiA2MCk7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gKDxQbGF5ZXIuUGxheWVyPnRoaXMuYXZhdGFyc1t0aGlzLnJhbmRvbVBsYXllcl0pLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyID09IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLICYmIHRoaXMuZ2V0Q3VycmVudEZyYW1lID49ICg8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tcImF0dGFja1wiXSkuZnJhbWVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXN0YW5jZSA8IDIgJiYgIXRoaXMuaXNBdHRhY2tpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0F0dGFja2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyID09IEVudGl0eS5CRUhBVklPVVIuSURMRSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1dcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBdHRhY2tpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuQVRUQUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuQVRUQUNLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RGFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwcm90ZWN0ZWQgZGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgMzAwLCAxLCAyNTAgKiA2MCwgNSk7XHJcbiAgICAgICAgbGFzdE1vdmVEaXJlY2l0b246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgICAgICBkYXNoQ291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdXHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gKDxQbGF5ZXIuUGxheWVyPnRoaXMuYXZhdGFyc1t0aGlzLnJhbmRvbVBsYXllcl0pLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZGlzdGFuY2UgPCAzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15UGF0cm9sIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHBhdHJvbFBvaW50czogxpIuVmVjdG9yMltdID0gW25ldyDGki5WZWN0b3IyKDAsIDQpLCBuZXcgxpIuVmVjdG9yMig1LCAwKV07XHJcbiAgICAgICAgd2FpdFRpbWU6IG51bWJlciA9IDEwMDA7XHJcbiAgICAgICAgY3VycmVuUG9pbnRJbmRleDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wYXRyb2woKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhdHJvbCgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoxpIuVmVjdG9yMy5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XS50b1ZlY3RvcjMoKSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbikpID4gMC4zKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoKMaSLlZlY3RvcjIuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0sIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW5Qb2ludEluZGV4ICsgMSA8IHRoaXMucGF0cm9sUG9pbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy53YWl0VGltZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNob290IGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHZpZXdSYWRpdXM6IG51bWJlciA9IDM7XHJcbiAgICAgICAgZ290UmVjb2duaXplZDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLndlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbig2MCwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCAyLCB0aGlzLm5ldElkLCBXZWFwb25zLkFJTS5IT01JTkcpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdvdFJlY29nbml6ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0RGFtYWdlKF92YWx1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ290UmVjb2duaXplZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBfZGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygwKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPCAzIHx8IHRoaXMuZ290UmVjb2duaXplZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIC8vIGlmICh0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQgPiAwICYmIF9kaXJlY3Rpb24ubWFnbml0dWRlIDwgdGhpcy52aWV3UmFkaXVzKSB7XHJcbiAgICAgICAgICAgIC8vICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAvLyAgICAgLy8gbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSBuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQobmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSksIF9kaXJlY3Rpb24sIENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgYnVsbGV0Lm93bmVyID0gdGhpcy50YWc7XHJcbiAgICAgICAgICAgIC8vICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIGJ1bGxldC5zcGVlZCk7XHJcbiAgICAgICAgICAgIC8vICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldEF0RW5lbXkoYnVsbGV0Lm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgLy8gICAgICAgICB0aGlzLndlYXBvbi5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuXHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFN1bW1vbm9yQWRkcyBleHRlbmRzIEVuZW15RGFzaCB7XHJcbiAgICAgICAgYXZhdGFyOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgICAgIHJhbmRvbVBsYXllciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3RhcmdldDogUGxheWVyLlBsYXllciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXIgPSBfdGFyZ2V0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuYXZhdGFyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpc3RhbmNlIDwgMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICAvLyBleHBvcnQgY2xhc3MgRW5lbXlDaXJjbGUgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAvLyAgICAgZGlzdGFuY2U6IG51bWJlciA9IDU7XHJcblxyXG4gICAgLy8gICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9wcm9wZXJ0aWVzOiBQbGF5ZXIuQ2hhcmFjdGVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIpIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIoX25hbWUsIF9wcm9wZXJ0aWVzLCBfcG9zaXRpb24pO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgbW92ZSgpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubW92ZSgpO1xyXG4gICAgLy8gICAgICAgICB0aGlzLm1vdmVDaXJjbGUoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGxpZmVzcGFuKF9ncmFwaDogxpIuTm9kZSk6IHZvaWQge1xyXG4gICAgLy8gICAgICAgICBzdXBlci5saWZlc3BhbihfZ3JhcGgpO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgYXN5bmMgbW92ZUNpcmNsZSgpIHtcclxuICAgIC8vICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAvLyAgICAgICAgIGNvbnNvbGUubG9nKHRoaXMudGFyZ2V0KTtcclxuICAgIC8vICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMSA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICAvLyBsZXQgZGlzdGFuY2VQbGF5ZXIyID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5wbGF5ZXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAvLyAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPiB0aGlzLmRpc3RhbmNlKSB7XHJcbiAgICAvLyAgICAgICAgICAgICB0aGlzLm1vdmVTaW1wbGUoKTtcclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgIC8vICAgICAgICAgICAgIGxldCBkZWdyZWUgPSBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLnRhcmdldClcclxuICAgIC8vICAgICAgICAgICAgIGxldCBhZGQgPSAwO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vIHdoaWxlIChkaXN0YW5jZVBsYXllcjEgPD0gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBJbnB1dFN5c3RlbS5jYWxjUG9zaXRpb25Gcm9tRGVncmVlKGRlZ3JlZSArIGFkZCwgdGhpcy5kaXN0YW5jZSkudG9WZWN0b3IzKDApKTtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGRpcmVjdGlvbi5zY2FsZSgoMSAvIEdhbWUuZnJhbWVSYXRlICogdGhpcy5wcm9wZXJ0aWVzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoZGlyZWN0aW9uLCB0cnVlKTtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBhZGQgKz0gNTtcclxuICAgIC8vICAgICAgICAgICAgIC8vIH1cclxuXHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICB9XHJcbiAgICAvLyB9XHJcbn0iLCJuYW1lc3BhY2UgSW50ZXJmYWNlcyB7XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElTcGF3bmFibGUge1xyXG4gICAgICAgIGxpZmV0aW1lPzogbnVtYmVyO1xyXG4gICAgICAgIGRlc3Bhd24oKTogdm9pZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSk6IHZvaWQ7XHJcbiAgICAgICAgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS2lsbGFibGUge1xyXG4gICAgICAgIG9uRGVhdGgoKTogdm9pZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElEYW1hZ2VhYmxlIHtcclxuICAgICAgICBnZXREYW1hZ2UoKTogdm9pZDtcclxuICAgIH1cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgTmV0d29ya09iamVjdHMge1xyXG4gICAgICAgIG5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgbmV0T2JqZWN0Tm9kZTogR2FtZS7Gki5Ob2RlO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSW5wdXRCdWxsZXRQYXlsb2FkIHtcclxuICAgICAgICB0aWNrOiBudW1iZXI7XHJcbiAgICAgICAgaW5wdXRWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJbnB1dEF2YXRhclBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICB0aWNrOiBudW1iZXI7XHJcbiAgICAgICAgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcbiAgICAvLyBleHBvcnQgaW50ZXJmYWNlIEJ1bGxldEluZm9ybWF0aW9uIHtcclxuICAgIC8vICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgLy8gICAgIGhpdFBvaW50OiBudW1iZXI7XHJcbiAgICAvLyAgICAgbGlmZVRpbWU6IG51bWJlcjtcclxuICAgIC8vICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyO1xyXG4gICAgLy8gICAgIHBhc3N0aHJvdWdoRW5lbXk6IG51bWJlcjtcclxuICAgIC8vICAgICBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgLy8gICAgIGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgLy8gICAgIHJvdGF0aW9uRGVnOiBudW1iZXI7XHJcbiAgICAvLyAgICAgaG9taW5nVGFyZ2V0PzogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgLy8gfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBSb29tRXhpdHMge1xyXG4gICAgICAgIG5vcnRoOiBib29sZWFuO1xyXG4gICAgICAgIGVhc3Q6IGJvb2xlYW47XHJcbiAgICAgICAgc291dGg6IGJvb2xlYW47XHJcbiAgICAgICAgd2VzdDogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIFJvb20ge1xyXG4gICAgICAgIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgZXhpdHM6IFJvb21FeGl0cztcclxuICAgICAgICByb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRTtcclxuICAgICAgICBkaXJlY3Rpb246IFJvb21FeGl0cztcclxuICAgICAgICB0cmFuc2xhdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1JRCB7XHJcbiAgICAgICAgSUNFQlVDS0VUQ0hBTExFTkdFLFxyXG4gICAgICAgIERNR1VQLFxyXG4gICAgICAgIFNQRUVEVVAsXHJcbiAgICAgICAgUFJPSkVDVElMRVNVUCxcclxuICAgICAgICBIRUFMVEhVUCxcclxuICAgICAgICBTQ0FMRVVQLFxyXG4gICAgICAgIFNDQUxFRE9XTixcclxuICAgICAgICBBUk1PUlVQLFxyXG4gICAgICAgIEhPTUVDT01JTkcsXHJcbiAgICAgICAgVE9YSUNSRUxBVElPTlNISVAsXHJcbiAgICAgICAgVkFNUFksXHJcbiAgICAgICAgU0xPV1lTTE9XXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0SWNlQnVja2V0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dERtZ1VwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEhlYWx0aFVwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRveGljUmVsYXRpb25zaGlwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJdGVtIGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5JVEVNO1xyXG4gICAgICAgIGlkOiBJVEVNSUQ7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXIgPSBOZXR3b3JraW5nLmlkR2VuZXJhdG9yKHRoaXMpO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHRyYW5zZm9ybTogxpIuQ29tcG9uZW50VHJhbnNmb3JtID0gbmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHBvc2l0aW9uOiDGki5WZWN0b3IyXHJcbiAgICAgICAgYnVmZjogQnVmZi5CdWZmW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiaXRlbVwiKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goPEludGVyZmFjZXMuTmV0d29ya09iamVjdHM+eyBuZXRJZDogX25ldElkLCBuZXRPYmplY3ROb2RlOiB0aGlzIH0pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCgpKSk7XHJcbiAgICAgICAgICAgIGxldCBtYXRlcmlhbDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ3aGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobWF0ZXJpYWwpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmZi5wdXNoKHRoaXMuZ2V0QnVmZkJ5SWQoKSk7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0VGV4dHVyZUJ5SWQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEJ1ZmZCeUlkKCk6IEJ1ZmYuQnVmZiB7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wOiBJdGVtcy5CdWZmSXRlbSA9IGdldEJ1ZmZJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmYuRGFtYWdlQnVmZihCdWZmLkJVRkZJRC5QT0lTT04sIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkRhbWFnZUJ1ZmYoQnVmZi5CVUZGSUQuQkxFRURJTkcsIHRlbXAuZHVyYXRpb24sIHRlbXAudGlja1JhdGUsIHRlbXAudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0xPV1lTTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihCdWZmLkJVRkZJRC5TTE9XLCB0ZW1wLmR1cmF0aW9uLCB0ZW1wLnRpY2tSYXRlLCB0ZW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIGxvYWRUZXh0dXJlKF90ZXh0dXJlOiDGki5UZXh0dXJlSW1hZ2UpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBuZXdUeHQgPSBfdGV4dHVyZTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHNldFRleHR1cmVCeUlkKCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELklDRUJVQ0tFVENIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7IC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TUEVFRFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEhlYWx0aFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0VG94aWNSZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRJY2VCdWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUl0ZW0odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb1lvdXJUaGluZyhfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEludGVybmFsSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZ2V0SW50ZXJuYWxJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgaWYgKGl0ZW0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBpdGVtLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBpdGVtLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSBpdGVtLmltZ1NyYztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduSXRlbSh0aGlzLCB0aGlzLmlkLCBfcG9zaXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICB0aGlzLnNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5JQ0VCVUNLRVRDSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkRNR1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgKz0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlBST0pFQ1RJTEVTVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhFQUxUSFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMudXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHNldCBuZXcgY29sbGlkZXIgYW5kIHN5bmMgb3ZlciBuZXR3b3JrXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRURPV046XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMudXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHNldCBuZXcgY29sbGlkZXIgYW5kIHN5bmMgb3ZlciBuZXR3b3JrXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyhfYXZhdGFyLmF0dHJpYnV0ZXMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5SYW5nZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYWltVHlwZSA9IFdlYXBvbnMuQUlNLkhPTUlORztcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHRhbGsgd2l0aCB0b2JpXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJ1ZmZJdGVtIGV4dGVuZHMgSXRlbSB7XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICB0aWNrUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIGR1cmF0aW9uOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgbGV0IHRlbXAgPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IHRlbXAubmFtZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRlbXAudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSB0ZW1wLnRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gdGVtcC5kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSB0ZW1wLmltZ1NyYztcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkl0ZW0odGhpcywgdGhpcy5pZCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkb1lvdXJUaGluZyhfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QnVmZkJ5SWQoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVmZkJ5SWQoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdCdWZmID0gdGhpcy5idWZmLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IEJ1ZmYuQlVGRklELlBPSVNPTikuY2xvbmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdCdWZmLmR1cmF0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICg8QnVmZi5EYW1hZ2VCdWZmPm5ld0J1ZmYpLnZhbHVlID0gMC41O1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYnVmZnMucHVzaChuZXdCdWZmKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KF9hdmF0YXIuYnVmZnMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEludGVybmFsSXRlbUJ5SWQoX2lkOiBJVEVNSUQpOiBJdGVtcy5JbnRlcm5hbEl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBHYW1lLmludGVybmFsSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0QnVmZkl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuQnVmZkl0ZW0ge1xyXG4gICAgICAgIHJldHVybiBHYW1lLmJ1ZmZJdGVtSlNPTi5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBfaWQpO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEFuaW1hdGlvbkdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U21hbGxUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRCYXRJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTa2VsZXRvbklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2tlbGV0b25XYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VySWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VyV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VyQXR0YWNrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkNvbnRhaW5lciB7XHJcbiAgICAgICAgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBzY2FsZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgZnJhbWVSYXRlOiBbc3RyaW5nLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmdldEFuaW1hdGlvbkJ5SWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkQW5pbWF0aW9uKF9hbmk6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uLCBfc2NhbGU6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uc1tfYW5pLm5hbWVdID0gX2FuaTtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS5wdXNoKFtfYW5pLm5hbWUsIF9zY2FsZV0pO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZS5wdXNoKFtfYW5pLm5hbWUsIF9mcmFtZVJhdGVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEFuaW1hdGlvbkJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKGJhdElkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBiYXRJZGxlLmFuaW1hdGlvblNjYWxlLCBiYXRJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ocmVkVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCByZWRUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgcmVkVGlja1dhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrSWRsZS5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNtYWxsVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzbWFsbFRpY2tXYWxrLmFuaW1hdGlvblNjYWxlLCBzbWFsbFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbklkbGUuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNrZWxldG9uV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNrZWxldG9uV2Fsay5hbmltYXRpb25TY2FsZSwgc2tlbGV0b25XYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcklkbGUuYW5pbWF0aW9uU2NhbGUsIG9nZXJJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VyV2Fsay5hbmltYXRpb25TY2FsZSwgb2dlcldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VyQXR0YWNrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlckF0dGFjay5hbmltYXRpb25TY2FsZSwgb2dlckF0dGFjay5mcmFtZVJhdGUpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjbGFzcyBNeUFuaW1hdGlvbkNsYXNzIHtcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25OYW1lOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIHNwcml0ZVNoZWV0OiDGki5UZXh0dXJlSW1hZ2U7XHJcbiAgICAgICAgYW1vdW50T2ZGcmFtZXM6IG51bWJlcjtcclxuICAgICAgICBmcmFtZVJhdGU6IG51bWJlcjtcclxuICAgICAgICBnZW5lcmF0ZWRTcHJpdGVBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uO1xyXG4gICAgICAgIGFuaW1hdGlvblNjYWxlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYW5pbWF0aW9uTmFtZTogc3RyaW5nLCBfdHh0SWRsZTogxpIuVGV4dHVyZUltYWdlLCBfYW1vdW50T2ZGcmFtZXM6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyLCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbk5hbWUgPSBfYW5pbWF0aW9uTmFtZTtcclxuICAgICAgICAgICAgdGhpcy5zcHJpdGVTaGVldCA9IF90eHRJZGxlO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW1vdW50T2ZGcmFtZXMgPSBfYW1vdW50T2ZGcmFtZXM7XHJcbiAgICAgICAgICAgIGdlbmVyYXRlQW5pbWF0aW9uRnJvbUdyaWQodGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiBzcHJpdGVTaGVldFxyXG4gICAgbGV0IGJhdElkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHJlZFRpY2tJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHJlZFRpY2tXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBzbWFsbFRpY2tJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHNtYWxsVGlja1dhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHNrZWxldG9uSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBza2VsZXRvbldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IG9nZXJJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IG9nZXJXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IG9nZXJBdHRhY2s6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIEFuaW1hdGlvbkNvbnRhaW5lclxyXG4gICAgbGV0IGJhdEFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IHJlZFRpY2tBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBzbWFsbFRpY2tBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBza2VsZXRvbkFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IG9nZXJBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKSB7XHJcblxyXG4gICAgICAgIGJhdElkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuQkFULCBcImlkbGVcIiwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG5cclxuICAgICAgICByZWRUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcImlkbGVcIiwgdHh0UmVkVGlja0lkbGUsIDYsIDEyKTtcclxuICAgICAgICByZWRUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcIndhbGtcIiwgdHh0UmVkVGlja1dhbGssIDQsIDEyKTtcclxuXHJcbiAgICAgICAgc21hbGxUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwiaWRsZVwiLCB0eHRTbWFsbFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc21hbGxUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwid2Fsa1wiLCB0eHRTbWFsbFRpY2tXYWxrLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHNrZWxldG9uSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJpZGxlXCIsIHR4dFNrZWxldG9uSWRsZSwgNSwgMTIpO1xyXG4gICAgICAgIHNrZWxldG9uV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJ3YWxrXCIsIHR4dFNrZWxldG9uV2FsaywgNywgMTIpO1xyXG5cclxuICAgICAgICBvZ2VySWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImlkbGVcIiwgdHh0T2dlcklkbGUsIDUsIDYpO1xyXG4gICAgICAgIG9nZXJXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwid2Fsa1wiLCB0eHRPZ2VyV2FsaywgNiwgNik7XHJcbiAgICAgICAgb2dlckF0dGFjayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImF0dGFja1wiLCB0eHRPZ2VyQXR0YWNrLCAxMCwgMTIpO1xyXG5cclxuXHJcbiAgICAgICAgYmF0QW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuQkFUKTtcclxuICAgICAgICByZWRUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuUkVEVElDSyk7XHJcbiAgICAgICAgc21hbGxUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU01BTExUSUNLKTtcclxuICAgICAgICBza2VsZXRvbkFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNLRUxFVE9OKTtcclxuICAgICAgICBvZ2VyQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuT0dFUik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEFuaW1hdGlvbkJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXRBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVkVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNtYWxsVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2tlbGV0b25BbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2dlckFuaW1hdGlvbjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGdldFBpeGVsUmF0aW8oX3dpZHRoOiBudW1iZXIsIF9oZWlnaHQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IG1heCA9IE1hdGgubWF4KF93aWR0aCwgX2hlaWdodCk7XHJcbiAgICAgICAgbGV0IG1pbiA9IE1hdGgubWluKF93aWR0aCwgX2hlaWdodCk7XHJcblxyXG4gICAgICAgIGxldCBzY2FsZSA9IDEgLyBtYXggKiBtaW47XHJcbiAgICAgICAgcmV0dXJuIHNjYWxlO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKF9jbGFzczogTXlBbmltYXRpb25DbGFzcykge1xyXG4gICAgICAgIGxldCBjbHJXaGl0ZTogxpIuQ29sb3IgPSDGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKTtcclxuICAgICAgICBsZXQgY29hdGVkU3ByaXRlU2hlZXQ6IMaSLkNvYXRUZXh0dXJlZCA9IG5ldyDGki5Db2F0VGV4dHVyZWQoY2xyV2hpdGUsIF9jbGFzcy5zcHJpdGVTaGVldCk7XHJcbiAgICAgICAgbGV0IHdpZHRoOiBudW1iZXIgPSBfY2xhc3Muc3ByaXRlU2hlZXQudGV4SW1hZ2VTb3VyY2Uud2lkdGggLyBfY2xhc3MuYW1vdW50T2ZGcmFtZXM7XHJcbiAgICAgICAgbGV0IGhlaWdodDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLmhlaWdodDtcclxuICAgICAgICBsZXQgY3JlYXRlZEFuaW1hdGlvbjogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24gPSBuZXcgxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oX2NsYXNzLmFuaW1hdGlvbk5hbWUsIGNvYXRlZFNwcml0ZVNoZWV0KTtcclxuICAgICAgICBjcmVhdGVkQW5pbWF0aW9uLmdlbmVyYXRlQnlHcmlkKMaSLlJlY3RhbmdsZS5HRVQoMCwgMCwgd2lkdGgsIGhlaWdodCksIF9jbGFzcy5hbW91bnRPZkZyYW1lcywgMzIsIMaSLk9SSUdJTjJELkNFTlRFUiwgxpIuVmVjdG9yMi5YKHdpZHRoKSk7XHJcbiAgICAgICAgX2NsYXNzLmFuaW1hdGlvblNjYWxlID0gZ2V0UGl4ZWxSYXRpbyh3aWR0aCwgaGVpZ2h0KTtcclxuICAgICAgICBfY2xhc3MuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uID0gY3JlYXRlZEFuaW1hdGlvbjtcclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCB0aW1lcjogbnVtYmVyID0gMDtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudFRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIG1pblRpbWVCZXR3ZWVuVGlja3M6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZ2FtZVRpY2tSYXRlOiBudW1iZXIgPSA2Mi41O1xyXG4gICAgICAgIHByb3RlY3RlZCBidWZmZXJTaXplOiBudW1iZXIgPSAxMDI0O1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBHYW1lLsaSLk5vZGUgeyByZXR1cm4gTmV0d29ya2luZy5jdXJyZW50SURzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkubmV0T2JqZWN0Tm9kZSB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGVCdWZmZXI6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkW107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzID0gMSAvIHRoaXMuZ2FtZVRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyID0gbmV3IEFycmF5PEludGVyZmFjZXMuU3RhdGVQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBoYW5kbGVUaWNrKCkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHByb2Nlc3NNb3ZlbWVudChpbnB1dDogSW50ZXJmYWNlcy5JbnB1dEF2YXRhclBheWxvYWQpOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfS8vI3JlZ2lvbiAgYnVsbGV0IFByZWRpY3Rpb25cclxuICAgIGFic3RyYWN0IGNsYXNzIEJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KGlucHV0OiBJbnRlcmZhY2VzLklucHV0QnVsbGV0UGF5bG9hZCk6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgbGV0IGNsb25lSW5wdXRWZWN0b3IgPSBpbnB1dC5pbnB1dFZlY3Rvci5jbG9uZTtcclxuICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQgPSA8QnVsbGV0cy5CdWxsZXQ+dGhpcy5vd25lcjtcclxuICAgICAgICAgICAgYnVsbGV0Lm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG4gICAgICAgICAgICBsZXQgbmV3U3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZCA9IHsgdGljazogaW5wdXQudGljaywgcG9zaXRpb246IGJ1bGxldC5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTZXJ2ZXJCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dFF1ZXVlOiBRdWV1ZSA9IG5ldyBRdWV1ZSgpO1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlRW50aXR5VG9DaGVjayhfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRpbWVyICs9IEdhbWUuZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lciA+PSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVUaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaWNrKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSAtMTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuaW5wdXRRdWV1ZS5nZXRRdWV1ZUxlbmd0aCgpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JbnB1dEJ1bGxldFBheWxvYWQgPSA8SW50ZXJmYWNlcy5JbnB1dEJ1bGxldFBheWxvYWQ+dGhpcy5pbnB1dFF1ZXVlLmRlcXVldWUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBidWZmZXJJbmRleCA9IGlucHV0UGF5bG9hZC50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJ1ZmZlckluZGV4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAvL1NlbmQgdG8gY2xpZW50IG5ldyBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kU2VydmVyQnVmZmVyKHRoaXMub3duZXJOZXRJZCwgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25DbGllbnRJbnB1dChpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcjogSW50ZXJmYWNlcy5JbnB1dEJ1bGxldFBheWxvYWRbXTtcclxuICAgICAgICBwcml2YXRlIGxhdGVzdFNlcnZlclN0YXRlOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGxhc3RQcm9jZXNzZWRTdGF0ZTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBmbHlEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4xO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JbnB1dEJ1bGxldFBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZmx5RGlyZWN0aW9uID0gKDxCdWxsZXRzLkJ1bGxldD50aGlzLm93bmVyKS5mbHlEaXJlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSW5wdXRCdWxsZXRQYXlsb2FkID0geyB0aWNrOiB0aGlzLmN1cnJlbnRUaWNrLCBpbnB1dFZlY3RvcjogdGhpcy5mbHlEaXJlY3Rpb24gfTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlcltidWZmZXJJbmRleF0gPSBpbnB1dFBheWxvYWQ7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGlucHV0UGF5bG9hZC50aWNrICsgXCJfX19cIiArIGlucHV0UGF5bG9hZC5pbnB1dFZlY3Rvci5jbG9uZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKTtcclxuXHJcbiAgICAgICAgICAgIC8vc2VuZCBpbnB1dFBheWxvYWQgdG8gaG9zdFxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRCdWxsZXRJbnB1dCh0aGlzLm93bmVyTmV0SWQsIGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSA9IF9zZXJ2ZXJTdGF0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4ID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb25FcnJvcjogbnVtYmVyID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbiwgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XS5wb3NpdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb25FcnJvciA+IHRoaXMuQXN5bmNUb2xlcmFuY2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybih0aGlzLm93bmVyLm5hbWUgKyBcIiBuZWVkIHRvIGJlIHVwZGF0ZWQgdG86IFg6XCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnggKyBcIiBZOiBcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdGlja1RvUHJvY2VzcyA9ICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgKyAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodGlja1RvUHJvY2VzcyA8IHRoaXMuY3VycmVudFRpY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiAgYXZhdGFyIFByZWNkaWN0aW9uXHJcbiAgICBhYnN0cmFjdCBjbGFzcyBBdmF0YXJQcmVkaWN0aW9uIGV4dGVuZHMgUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSW5wdXRBdmF0YXJQYXlsb2FkKTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQge1xyXG4gICAgICAgICAgICBsZXQgY2xvbmVJbnB1dFZlY3RvciA9IGlucHV0LmlucHV0VmVjdG9yLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoY2xvbmVJbnB1dFZlY3Rvci5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjbG9uZUlucHV0VmVjdG9yLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIGlucHV0LmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+dGhpcy5vd25lcikuZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5tb3ZlKGNsb25lSW5wdXRWZWN0b3IpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdTdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRCdWZmZXI6IEludGVyZmFjZXMuSW5wdXRBdmF0YXJQYXlsb2FkW107XHJcbiAgICAgICAgcHJpdmF0ZSBsYXRlc3RTZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0UHJvY2Vzc2VkU3RhdGU6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSB2ZXJ0aWNhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIEFzeW5jVG9sZXJhbmNlOiBudW1iZXIgPSAwLjE7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklucHV0QXZhdGFyUGF5bG9hZD4odGhpcy5idWZmZXJTaXplKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmhvcml6b250YWxJbnB1dCA9IElucHV0U3lzdGVtLm1vdmUoKS54O1xyXG4gICAgICAgICAgICB0aGlzLnZlcnRpY2FsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueTtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGhpcy5jdXJyZW50VGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgdGhpcy5zd2l0Y2hBdmF0YXJBYmlsaXR5U3RhdGUoKTtcclxuICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JbnB1dEF2YXRhclBheWxvYWQgPSB7IHRpY2s6IHRoaXMuY3VycmVudFRpY2ssIGlucHV0VmVjdG9yOiBuZXcgxpIuVmVjdG9yMyh0aGlzLmhvcml6b250YWxJbnB1dCwgdGhpcy52ZXJ0aWNhbElucHV0LCAwKSwgZG9lc0FiaWxpdHk6IHRoaXMuZG9lc0FiaWxpdHkgfTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlcltidWZmZXJJbmRleF0gPSBpbnB1dFBheWxvYWQ7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGlucHV0UGF5bG9hZC50aWNrICsgXCJfX19cIiArIGlucHV0UGF5bG9hZC5pbnB1dFZlY3Rvci5jbG9uZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKTtcclxuXHJcbiAgICAgICAgICAgIC8vc2VuZCBpbnB1dFBheWxvYWQgdG8gaG9zdFxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRDbGllbnRJbnB1dCh0aGlzLm93bmVyTmV0SWQsIGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2hBdmF0YXJBYmlsaXR5U3RhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmICgoPEVudGl0eS5FbnRpdHk+dGhpcy5vd25lcikuaWQgPT0gRW50aXR5LklELlJBTkdFRCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9ICg8UGxheWVyLlJhbmdlZD50aGlzLm93bmVyKS5kYXNoLmRvZXNBYmlsaXR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9ICg8UGxheWVyLk1lbGVlPnRoaXMub3duZXIpLmJsb2NrLmRvZXNBYmlsaXR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIG9uU2VydmVyTW92ZW1lbnRTdGF0ZShfc2VydmVyU3RhdGU6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgPSBfc2VydmVyU3RhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2VydmVyU3RhdGVCdWZmZXJJbmRleCA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uRXJyb3I6IG51bWJlciA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24sIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0ucG9zaXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uRXJyb3IgPiB0aGlzLkFzeW5jVG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJ5b3UgbmVlZCB0byBiZSB1cGRhdGVkIHRvOiBYOlwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi54ICsgXCIgWTogXCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpY2tUb1Byb2Nlc3MgPSAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRpY2tUb1Byb2Nlc3MgPCB0aGlzLmN1cnJlbnRUaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudCh0aGlzLmlucHV0QnVmZmVyW3RpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGlja1RvUHJvY2VzcysrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTZXJ2ZXJQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRRdWV1ZTogUXVldWUgPSBuZXcgUXVldWUoKTtcclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZUVudGl0eVRvQ2hlY2soX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBoYW5kbGVUaWNrKCkge1xyXG5cclxuICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gLTE7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLmlucHV0UXVldWUuZ2V0UXVldWVMZW5ndGgoKSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSW5wdXRBdmF0YXJQYXlsb2FkID0gPEludGVyZmFjZXMuSW5wdXRBdmF0YXJQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidWZmZXJJbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy9TZW5kIHRvIGNsaWVudCBuZXcgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZFNlcnZlckJ1ZmZlcih0aGlzLm93bmVyTmV0SWQsIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQ2xpZW50SW5wdXQoaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0QXZhdGFyUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UXVldWUuZW5xdWV1ZShpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICBjbGFzcyBRdWV1ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtczogYW55W107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbnF1ZXVlKF9pdGVtOiBJbnRlcmZhY2VzLklucHV0QXZhdGFyUGF5bG9hZCB8IEludGVyZmFjZXMuSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaChfaXRlbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBkZXF1ZXVlKCk6IEludGVyZmFjZXMuSW5wdXRBdmF0YXJQYXlsb2FkIHwgSW50ZXJmYWNlcy5JbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcy5zaGlmdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0UXVldWVMZW5ndGgoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1zKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFiaWxpdHkge1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQ29vbGRvd247XHJcbiAgICAgICAgcHJvdGVjdGVkIGFiaWxpdHlDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGRvZXNBYmlsaXR5OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IF9kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5hYmlsaXR5Q291bnQgPSBfYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQ29vbGRvd24oX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICAvL2RvIHN0dWZmXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb29sZG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hY3RpdmF0ZUFiaWxpdHkoKVxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9lc0FiaWxpdHkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIH0sIHRoaXMuZHVyYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCbG9jayBleHRlbmRzIEFiaWxpdHkge1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYXNoIGV4dGVuZHMgQWJpbGl0eSB7XHJcbiAgICAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyLCBfZHVyYXRpb246IG51bWJlciwgX2FiaWxpdHlDb3VudDogbnVtYmVyLCBfY29vbGRvd25UaW1lOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkLCBfZHVyYXRpb24sIF9hYmlsaXR5Q291bnQsIF9jb29sZG93blRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuc3BlZWQgKj0gNTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5zcGVlZCAvPSA1O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3Bhd25TdW1tb25lcnMgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuU01BTExUSUNLLCB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBudWxsLCBHYW1lLmF2YXRhcjEsIG51bGwpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBjaXJjbGVTaG9vb3QgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwcml2YXRlIGJ1bGxldEFtb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWxsZXRBbW91bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWxsZXRzLnB1c2goKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDb29sZG93biB7XHJcbiAgICAgICAgcHVibGljIGhhc0Nvb2xEb3duOiBib29sZWFuXHJcbiAgICAgICAgcHJpdmF0ZSBjb29sRG93bjogbnVtYmVyXHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50Q29vbGRvd246IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbnVtYmVyOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sRG93biA9IF9udW1iZXI7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gX251bWJlcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGFydENvb2xEb3duKCkge1xyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gdHJ1ZVxyXG4gICAgICAgICAgICBHYW1lLmNvb2xEb3ducy5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICBHYW1lLsaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULkxPT1BfRlJBTUUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBlbmRDb29sRE93bigpIHtcclxuICAgICAgICAgICAgR2FtZS5jb29sRG93bnMgPSBHYW1lLmNvb2xEb3ducy5maWx0ZXIoY2QgPT4gY2QgIT0gdGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMuaGFzQ29vbERvd24gPSBmYWxzZTtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQ29vbERvd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVDb29sRG93bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvb2xkb3duID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24tLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gdGhpcy5jb29sRG93bjtcclxuICAgICAgICAgICAgICAgIHRoaXMuZW5kQ29vbERPd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlcyB7XHJcblxyXG4gICAgICAgIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIG1heEhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAgICAgaGl0YWJsZTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgYXJtb3I6IG51bWJlcjtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGF0dGFja1BvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGNvb2xEb3duUmVkdWN0aW9uOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHNjYWxlOiBudW1iZXI7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9zY2FsZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2FybW9yOiBudW1iZXIsIF9jb29sZG93blJlZHVjdGlvbj86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gX3NjYWxlO1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gX2FybW9yO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IF9oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gdGhpcy5oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gX2F0dGFja1BvaW50cztcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IF9rbm9ja2JhY2tGb3JjZVxyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gdGhpcy5rbm9ja2JhY2tGb3JjZSAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDA7XHJcbiAgICAgICAgICAgIGlmIChfY29vbGRvd25SZWR1Y3Rpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5tYXhIZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuaGVhbHRoUG9pbnRzICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLmF0dGFja1BvaW50cyAqIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gTWF0aC5mcm91bmQodGhpcy5zcGVlZCAvIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gdGhpcy5rbm9ja2JhY2tGb3JjZSAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuICAgIGV4cG9ydCBjbGFzcyBTdW1tb25vciBleHRlbmRzIEVuZW15U2hvb3Qge1xyXG4gICAgICAgIGRhbWFnZVRha2VuOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGJlZ2luRGVmZW5jZVBoYXNlOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgZGVmZW5jZVBoYXNlVGltZTogbnVtYmVyID0gNzIwO1xyXG4gICAgICAgIGRlZmVuY2VQaGFzZUN1cnJlbnRUaW1lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHN1bW1vbkNoYW5jZTogbnVtYmVyID0gNTtcclxuICAgICAgICBzdW1tb25Db29sZG93bjogbnVtYmVyID0gMTIwO1xyXG4gICAgICAgIHN1bW1vbkN1cnJlbnRDb29sZG93bjogbnVtYmVyID0gMDtcclxuICAgICAgICBwcml2YXRlIHN1bW1vbjogQWJpbGl0eS5TcGF3blN1bW1vbmVycyA9IG5ldyBBYmlsaXR5LlNwYXduU3VtbW9uZXJzKHRoaXMubmV0SWQsIDAsIDUsIDUgKiA2MClcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvb2xkb3duKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zdW1tb25DdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN1bW1vbkN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24oKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nb3RSZWNvZ25pemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFtYWdlVGFrZW4gPj0gMjUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5kYW1hZ2VUYWtlbiArPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNraW5nUGhhc2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuU1VNTU9OKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF0dGFja2luZ1BoYXNlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlZmVuY2VQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBtYWtlIGlmIGRlcGVuZGVudCBmcm9tIHRlbGVwb3J0IGFuaW1hdGlvbiBmcmFtZVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZXF1YWxzKG5ldyDGki5WZWN0b3IyKDAsIC0xMykudG9WZWN0b3IzKCksIDEpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUobmV3IMaSLlZlY3RvcjIoMCwgLTEzKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmVnaW5EZWZlbmNlUGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZUN1cnJlbnRUaW1lID0gTWF0aC5yb3VuZCh0aGlzLmRlZmVuY2VQaGFzZVRpbWUgKyBNYXRoLnJhbmRvbSgpICogMTIwKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luRGVmZW5jZVBoYXNlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlZmVuY2VQaGFzZUN1cnJlbnRUaW1lID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyhuZXcgxpIuVmVjdG9yMigwLCAtMTMpLnRvVmVjdG9yMygpLCAxKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjIoMCwgLTEzKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuc3VtbW9uQ3VycmVudENvb2xkb3duIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuc3VtbW9uLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0U3RhdGUgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRTdGF0ZSA8PSB0aGlzLnN1bW1vbkNoYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5zdW1tb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3VtbW9uLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdW1tb25DdXJyZW50Q29vbGRvd24gPSB0aGlzLnN1bW1vbkNvb2xkb3duO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2VDdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhbWFnZVRha2VuID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luRGVmZW5jZVBoYXNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN1bW1vbigpIHtcclxuICAgICAgICAvLyAgICAgbGV0IHRhcmdldCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcbiAgICAgICAgLy8gICAgIGlmICh0YXJnZXQgPiAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuU01BTExUSUNLLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBudWxsLCBHYW1lLmF2YXRhcjEpO1xyXG4gICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELlNNQUxMVElDSywgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgbnVsbCwgR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWZmIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBCVUZGSUQge1xyXG4gICAgICAgIEJMRUVESU5HLFxyXG4gICAgICAgIFBPSVNPTixcclxuICAgICAgICBIRUFMLFxyXG4gICAgICAgIFNMT1dcclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWZmIHtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXJcclxuICAgICAgICBpZDogQlVGRklEO1xyXG4gICAgICAgIHByb3RlY3RlZCBub0R1cmF0aW9uOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IF9kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50aWNrUmF0ZSA9IF90aWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5ub0R1cmF0aW9uID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldFBhcnRpY2xlQnlJZChfaWQ6IEJVRkZJRCk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELlBPSVNPTiwgVUkucG9pc29uUGFydGljbGUsIDYsIDEyKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNsb25lKCk6IEJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGx5QnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRUb0VudGl0eShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmJ1ZmZzLmZpbHRlcihidWZmID0+IGJ1ZmYuaWQgPT0gdGhpcy5pZCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIF9hdmF0YXIuYnVmZnMucHVzaCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjbG9uZSgpOiBEYW1hZ2VCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYW1hZ2VCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnJlbW92ZUNoaWxkKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5kdXJhdGlvbiAlIHRoaXMudGlja1JhdGUgPT0gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ub0R1cmF0aW9uICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFydGljbGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYWRkQ2hpbGQocGFydGljbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24rKztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZEYW1nZUJ5SWQodGhpcy5pZCwgX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEJ1ZmZEYW1nZUJ5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELkJMRUVESU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgZG8gZGFtYWdlIHRvIHBsYXllciB1bnRpbCBoZSBoYXMgMjAlIGhlYWx0aFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAwLjIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXNCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgaXNCdWZmQXBwbGllZDogYm9vbGVhbjtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIHJlbW92ZWRWYWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2xvbmUoKTogQXR0cmlidXRlc0J1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEF0dHJpYnV0ZXNCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghdGhpcy5pc0J1ZmZBcHBsaWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoX2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJ0aWNsZSA9IHRoaXMuZ2V0UGFydGljbGVCeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbisrO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbW92ZUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZBdHRyaWJ1dGVCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXBwbHlCdWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRCdWZmQXR0cmlidXRlQnlJZCh0aGlzLmlkLCBfYXZhdGFyLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0QnVmZkF0dHJpYnV0ZUJ5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIDUwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkIC09IHRoaXMucmVtb3ZlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVMTEVUVFlQRSB7XHJcbiAgICAgICAgU1RBTkRBUkQsXHJcbiAgICAgICAgSElHSFNQRUVELFxyXG4gICAgICAgIFNMT1csXHJcbiAgICAgICAgTUVMRUVcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUsIEludGVyZmFjZXMuSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkJVTExFVDtcclxuICAgICAgICBvd25lcjogbnVtYmVyOyBnZXQgX293bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyKSB9O1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjbGllbnRQcmVkaWN0aW9uOiBOZXR3b3JraW5nLkNsaWVudEJ1bGxldFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIHNlcnZlclByZWRpY3Rpb246IE5ldHdvcmtpbmcuU2VydmVyQnVsbGV0UHJlZGljdGlvbjtcclxuICAgICAgICBwdWJsaWMgZmx5RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG4gICAgICAgIGRpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuXHJcbiAgICAgICAgcHVibGljIGhpdFBvaW50c1NjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXIgPSAyMDtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMSAqIDYwO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXIgPSA0O1xyXG4gICAgICAgIHR5cGU6IEJVTExFVFRZUEU7XHJcblxyXG4gICAgICAgIHRpbWU6IG51bWJlciA9IDA7XHJcbiAgICAgICAga2lsbGNvdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVCdWxsZXQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9zcGVlZDogbnVtYmVyLCBfaGl0UG9pbnRzOiBudW1iZXIsIF9saWZldGltZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2tpbGxjb3VudDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9vd25lcklkOiBudW1iZXIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKDxJbnRlcmZhY2VzLk5ldHdvcmtPYmplY3RzPnsgbmV0SWQ6IF9uZXRJZCwgbmV0T2JqZWN0Tm9kZTogdGhpcyB9KTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcih0aGlzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IF9oaXRQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSBfa25vY2tiYWNrRm9yY2U7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gX2tpbGxjb3VudDtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlclBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKGNvbGxpZGVyUG9zaXRpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSAvIDEuNSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlgoKTtcclxuICAgICAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyID0gX293bmVySWQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUodGhpcy5mbHlEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudFByZWRpY3Rpb24gPSBuZXcgTmV0d29ya2luZy5DbGllbnRCdWxsZXRQcmVkaWN0aW9uKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNlcnZlclByZWRpY3Rpb24gPSBuZXcgTmV0d29ya2luZy5TZXJ2ZXJCdWxsZXRQcmVkaWN0aW9uKHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkICYmIHRoaXMuX293bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnRQcmVkaWN0aW9uLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX293bmVyID09IEdhbWUuYXZhdGFyMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VydmVyUHJlZGljdGlvbi51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMuZmx5RGlyZWN0aW9uLmNsb25lKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm10eExvY2FsLnJvdGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCAmJiB0aGlzLl9vd25lciA9PSBHYW1lLmF2YXRhcjIpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUodGhpcy5jbGllbnRQcmVkaWN0aW9uLm1pblRpbWVCZXR3ZWVuVGlja3MgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiDGkkFpZC5Ob2RlU3ByaXRlKTogdm9pZCB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWihDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCDGki5WZWN0b3IzLlNVTShfZGlyZWN0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikpICsgOTApO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBsb2FkVGV4dHVyZSgpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgbmV3VHh0ID0gYnVsbGV0VHh0O1xyXG4gICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1ZmYoX3RhcmdldDogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICB0aGlzLl9vd25lci5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5idWZmLmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmYuY2xvbmUoKS5hZGRUb0VudGl0eShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpc2lvbkRldGVjdGlvbigpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IMaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5fb3duZXIudGFnID09IFRhZy5UQUcuUExBWUVSKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogRW5lbXkuRW5lbXkgPSAoPEVuZW15LkVuZW15Pl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgRW5lbXkuU3VtbW9ub3JBZGRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5TdW1tb25vckFkZHM+ZWxlbWVudCkuYXZhdGFyID09IHRoaXMuX293bmVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXREYW1hZ2UodGhpcy5fb3duZXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgKiB0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWZmKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICBpZiAodGhpcy5fb3duZXIudGFnID09IFRhZy5UQUcuRU5FTVkpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50OiBQbGF5ZXIuUGxheWVyID0gKDxQbGF5ZXIuUGxheWVyPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSAmJiBlbGVtZW50LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkICYmIHRoaXMua2lsbGNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCAmJiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuYXR0cmlidXRlcy5oaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuZ2V0RGFtYWdlKHRoaXMuaGl0UG9pbnRzU2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMuaGl0UG9pbnRzU2NhbGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IFtdO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogR2VuZXJhdGlvbi5XYWxsID0gKDxHZW5lcmF0aW9uLldhbGw+X2VsZW0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZUJ1bGxldCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3NwZWVkOiBudW1iZXIsIF9oaXRQb2ludHM6IG51bWJlciwgX2xpZmV0aW1lOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfa2lsbGNvdW50OiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfc3BlZWQsIF9oaXRQb2ludHMsIF9saWZldGltZSwgX2tub2NrYmFja0ZvcmNlLCBfa2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50c1NjYWxlID0gMTA7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSA2O1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbG9hZFRleHR1cmUoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfc3BlZWQ6IG51bWJlciwgX2hpdFBvaW50czogbnVtYmVyLCBfbGlmZXRpbWU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9raWxsY291bnQ6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJJZDogbnVtYmVyLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfc3BlZWQsIF9oaXRQb2ludHMsIF9saWZldGltZSwgX2tub2NrYmFja0ZvcmNlLCBfa2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9vd25lcklkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIDYwO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMudGFyZ2V0ID0gxpIuVmVjdG9yMy5TVU0odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhcmdldChHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMudXBkYXRlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHN1cGVyLm1vdmUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlSG9taW5nKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRhcmdldChfbmV0SUQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjYWxjdWxhdGVIb21pbmcoKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAobmV3RGlyZWN0aW9uLnggIT0gMCAmJiBuZXdEaXJlY3Rpb24ueSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHJvdGF0ZUFtb3VudDI6IG51bWJlciA9IMaSLlZlY3RvcjMuQ1JPU1MobmV3RGlyZWN0aW9uLCB0aGlzLm10eExvY2FsLmdldFgoKSkuejtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKC1yb3RhdGVBbW91bnQyICogdGhpcy5yb3RhdGVTcGVlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENvbGxpZGVyIHtcclxuICAgIGV4cG9ydCBjbGFzcyBDb2xsaWRlciB7XHJcbiAgICAgICAgcHVibGljIG93bmVyTmV0SWQ6IG51bWJlcjtcclxuICAgICAgICByYWRpdXM6IG51bWJlcjtcclxuICAgICAgICBwb3NpdGlvbjogxpIuVmVjdG9yMjtcclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3JhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXMoX2NvbGxpZGVyOiBDb2xsaWRlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyA+IGRpc3RhbmNlLm1hZ25pdHVkZSkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZXNSZWN0KF9jb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGUpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGVmdCA+IF9jb2xsaWRlci5yaWdodCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yaWdodCA8IF9jb2xsaWRlci5sZWZ0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRvcCA+IF9jb2xsaWRlci5ib3R0b20pIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYm90dG9tIDwgX2NvbGxpZGVyLnRvcCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvbihfY29sbGlkZXI6IENvbGxpZGVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzKF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzIC0gZGlzdGFuY2UubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEludGVyc2VjdGlvblJlY3QoX2NvbGxpZGVyOiDGki5SZWN0YW5nbGUpOiDGki5SZWN0YW5nbGUge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXNSZWN0KF9jb2xsaWRlcikpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuXHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb246IMaSLlJlY3RhbmdsZSA9IG5ldyDGki5SZWN0YW5nbGUoKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnggPSBNYXRoLm1heCh0aGlzLmxlZnQsIF9jb2xsaWRlci5sZWZ0KTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLnkgPSBNYXRoLm1heCh0aGlzLnRvcCwgX2NvbGxpZGVyLnRvcCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi53aWR0aCA9IE1hdGgubWluKHRoaXMucmlnaHQsIF9jb2xsaWRlci5yaWdodCkgLSBpbnRlcnNlY3Rpb24ueDtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLmhlaWdodCA9IE1hdGgubWluKHRoaXMuYm90dG9tLCBfY29sbGlkZXIuYm90dG9tKSAtIGludGVyc2VjdGlvbi55O1xyXG5cclxuICAgICAgICAgICAgcmV0dXJuIGludGVyc2VjdGlvbjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXlTcGF3bmVyIHtcclxuICAgIGxldCBzcGF3blRpbWU6IG51bWJlciA9IDAgKiA2MDtcclxuICAgIGxldCBjdXJyZW50VGltZTogbnVtYmVyID0gc3Bhd25UaW1lO1xyXG4gICAgbGV0IG1heEVuZW1pZXM6IG51bWJlciA9IDA7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbWllcygpOiB2b2lkIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGxldCBjdXJyZW50Um9vbSA9ICg8R2VuZXJhdGlvbi5Sb29tPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVsZW0gPT4gKDxHZW5lcmF0aW9uLlJvb20+ZWxlbSkudGFnID09IFRhZy5UQUcuUk9PTSkpO1xyXG4gICAgICAgICAgICBtYXhFbmVtaWVzID0gY3VycmVudFJvb20uZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgd2hpbGUgKG1heEVuZW1pZXMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBtYXhFbmVtaWVzID0gY3VycmVudFJvb20uZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA9PSBzcGF3blRpbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMigoTWF0aC5yYW5kb20oKSAqIDcgLSAoTWF0aC5yYW5kb20oKSAqIDcpKSAqIDIsIChNYXRoLnJhbmRvbSgpICogNyAtIChNYXRoLnJhbmRvbSgpICogNykgKiAyKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcG9zaXRpb24uYWRkKGN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiB1c2UgSUQgdG8gZ2V0IHJhbmRvbSBlbmVtaWVzXHJcbiAgICAgICAgICAgICAgICAgICAgc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlTTUFTSCwgRW50aXR5LklELk9HRVIsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50Um9vbS5lbmVteUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGltZSA9IHNwYXduVGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRSYW5kb21FbmVteUlkKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHJhbmRvbSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKEVudGl0eS5JRCkubGVuZ3RoIC8gMik7XHJcbiAgICAgICAgaWYgKHJhbmRvbSA8PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21FbmVteUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyYW5kb20pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmFuZG9tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnlJRChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2F0dHJpYnV0ZXM/OiBFbnRpdHkuQXR0cmlidXRlcywgX3RhcmdldD86IFBsYXllci5QbGF5ZXIsIF9uZXRJRD86IG51bWJlcikge1xyXG4gICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXk7XHJcbiAgICAgICAgbGV0IHJlZiA9IG51bGw7XHJcbiAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gX2lkLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzd2l0Y2ggKF9lbmVteUNsYXNzKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURBU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEQVNIOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZUEFUUk9MOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8vIGNhc2UgRW5lbXkuRTpcclxuICAgICAgICAgICAgLy8gICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U21hc2goX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFM6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vckFkZHMoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3JBZGRzKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBOZXR3b3JraW5nLnNwYXduRW5lbXkoX2VuZW15Q2xhc3MsIGVuZW15LCBlbmVteS5uZXRJZCk7XHJcbiAgICAgICAgLy8gc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAvLyAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcImJhdFwiKTtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoRW50aXR5LklELkJBVCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihFbnRpdHkuSUQuQkFULCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwicmVkdGlja1wiKTtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goRW50aXR5LklELlJFRFRJQ0ssIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlICsgKE1hdGgucmFuZG9tKCkgKiAwLjIgLSBNYXRoLnJhbmRvbSgpICogMC4yKSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoRW50aXR5LklELlJFRFRJQ0ssIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5zY2FsZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgbmV3IFdlYXBvbnMuV2VhcG9uKDUwLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDEpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goRW50aXR5LklELlJFRFRJQ0ssIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgLy8gZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChFbnRpdHkuSUQuUkVEVElDSywgX2F0dHJpYnV0ZXMsIG5ldyBXZWFwb25zLldlYXBvbig1MCwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCAxKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAvLyAgICAgICAgIGlmIChfYXR0cmlidXRlcyA9PSBudWxsICYmIF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gXCJzbWFsbHRpY2tcIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKEVudGl0eS5JRC5TTUFMTFRJQ0ssIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlICsgKE1hdGgucmFuZG9tKCkgKiAwLjIgLSBNYXRoLnJhbmRvbSgpICogMC4yKSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKEVudGl0eS5JRC5TTUFMTFRJQ0ssIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBicmVhaztcclxuICAgICAgICAvLyAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwic2tlbGV0b25cIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVudGl0eS5JRC5TS0VMRVRPTiwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAoTWF0aC5yYW5kb20oKSAqIDAuMiAtIE1hdGgucmFuZG9tKCkgKiAwLjIpLCByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoRW50aXR5LklELlNLRUxFVE9OLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwib2dlclwiKTtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKEVudGl0eS5JRC5PR0VSLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSArIChNYXRoLnJhbmRvbSgpICogMC4yIC0gTWF0aC5yYW5kb20oKSAqIDAuMiksIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U21hc2goRW50aXR5LklELk9HRVIsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBicmVhaztcclxuICAgICAgICAvLyAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwic3VtbW9ub3JcIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoRW50aXR5LklELlNVTU1PTk9SLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSArIChNYXRoLnJhbmRvbSgpICogMC4yIC0gTWF0aC5yYW5kb20oKSAqIDAuMiksIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yKEVudGl0eS5JRC5TVU1NT05PUiwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICBkZWZhdWx0OlxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gfVxyXG4gICAgICAgIGlmIChlbmVteSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoZW5lbXkpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbmV0d29ya1NwYXduQnlJZChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfbmV0SUQ6IG51bWJlciwgX3RhcmdldD86IG51bWJlcikge1xyXG4gICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKEdhbWUuYXZhdGFyMS5uZXRJZCA9PSBfdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBzcGF3bkJ5SUQoX2VuZW15Q2xhc3MsIF9pZCwgX3Bvc2l0aW9uLCBfYXR0cmlidXRlcywgR2FtZS5hdmF0YXIxLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgX2F0dHJpYnV0ZXMsIEdhbWUuYXZhdGFyMiwgX25ldElEKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNwYXduQnlJRChfZW5lbXlDbGFzcywgX2lkLCBfcG9zaXRpb24sIF9hdHRyaWJ1dGVzLCBudWxsLCBfbmV0SUQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgQ2FsY3VsYXRpb24ge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldENsb3NlckF2YXRhclBvc2l0aW9uKF9zdGFydFBvaW50OiDGki5WZWN0b3IzKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IF9zdGFydFBvaW50LmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlUGxheWVyMSA8IGRpc3RhbmNlUGxheWVyMikge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChfdmVjdG9yVG9Sb3RhdGU6IMaSLlZlY3RvcjMsIF9hbmdsZTogbnVtYmVyKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IGFuZ2xlVG9SYWRpYW46IG51bWJlciA9IF9hbmdsZSAqIChNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1ggPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pIC0gX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLnNpbihhbmdsZVRvUmFkaWFuKTtcclxuICAgICAgICBsZXQgbmV3WSA9IF92ZWN0b3JUb1JvdGF0ZS54ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbikgKyBfdmVjdG9yVG9Sb3RhdGUueSAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pO1xyXG5cclxuICAgICAgICByZXR1cm4gbmV3IMaSLlZlY3RvcjMobmV3WCwgbmV3WSwgX3ZlY3RvclRvUm90YXRlLnopO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKCgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkgLyAxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9iYXNlVmFsdWU6IG51bWJlciwgX3BlcmNlbnRhZ2VBbW91bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIF9iYXNlVmFsdWUgKiAoMTAwIC8gKDEwMCArIF9wZXJjZW50YWdlQW1vdW50KSk7XHJcbiAgICB9XHJcblxyXG5cclxufSIsIm5hbWVzcGFjZSBJbnB1dFN5c3RlbSB7XHJcblxyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleWRvd25cIiwga2V5Ym9hcmREb3duRXZlbnQpO1xyXG4gICAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcihcImtleXVwXCIsIGtleWJvYXJkVXBFdmVudCk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vkb3duXCIsIGF0dGFjayk7XHJcbiAgICBHYW1lLmNhbnZhcy5hZGRFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIHJvdGF0ZVRvTW91c2UpO1xyXG5cclxuICAgIC8vI3JlZ2lvbiByb3RhdGVcclxuICAgIGxldCBtb3VzZVBvc2l0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgIGZ1bmN0aW9uIHJvdGF0ZVRvTW91c2UoX21vdXNlRXZlbnQ6IE1vdXNlRXZlbnQpOiB2b2lkIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IHJheTogxpIuUmF5ID0gR2FtZS52aWV3cG9ydC5nZXRSYXlGcm9tQ2xpZW50KG5ldyDGki5WZWN0b3IyKF9tb3VzZUV2ZW50Lm9mZnNldFgsIF9tb3VzZUV2ZW50Lm9mZnNldFkpKTtcclxuICAgICAgICAgICAgbW91c2VQb3NpdGlvbiA9IHJheS5pbnRlcnNlY3RQbGFuZShuZXcgxpIuVmVjdG9yMygwLCAwLCAwKSwgbmV3IMaSLlZlY3RvcjMoMCwgMCwgMSkpO1xyXG4gICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjEubXR4TG9jYWwucm90YXRpb24gPSBuZXcgxpIuVmVjdG9yMygwLCAwLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbW91c2VQb3NpdGlvbikpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNQb3NpdGlvbkZyb21EZWdyZWUoX2RlZ3JlZXM6IG51bWJlciwgX2Rpc3RhbmNlOiBudW1iZXIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICBsZXQgZGlzdGFuY2UgPSA1O1xyXG4gICAgICAgIGxldCBuZXdEZWcgPSAoX2RlZ3JlZXMgKiBNYXRoLlBJKSAvIDE4MDtcclxuICAgICAgICBsZXQgeSA9IE1hdGguY29zKG5ld0RlZyk7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnNpbihuZXdEZWcpICogLTE7XHJcbiAgICAgICAgbGV0IGNvb3JkID0gbmV3IMaSLlZlY3RvcjIoeCwgeSk7XHJcbiAgICAgICAgY29vcmQuc2NhbGUoZGlzdGFuY2UpO1xyXG4gICAgICAgIHJldHVybiBjb29yZDtcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBtb3ZlIGFuZCBhYmlsaXR5XHJcbiAgICBsZXQgY29udHJvbGxlciA9IG5ldyBNYXA8c3RyaW5nLCBib29sZWFuPihbXHJcbiAgICAgICAgW1wiV1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiQVwiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiU1wiLCBmYWxzZV0sXHJcbiAgICAgICAgW1wiRFwiLCBmYWxzZV1cclxuICAgIF0pO1xyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkRG93bkV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgIT0gXCJTUEFDRVwiKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgICAgICAgICAgY29udHJvbGxlci5zZXQoa2V5LCB0cnVlKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIC8vRG8gYWJpbHR5IGZyb20gcGxheWVyXHJcbiAgICAgICAgICAgICAgICBhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgPT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUucGF1c2UodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpOiBHYW1lLsaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJBXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJTXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm1vdmUobW92ZVZlY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIG1vdmVWZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWJpbGl0eSgpIHtcclxuICAgICAgICBHYW1lLmF2YXRhcjEuZG9BYmlsaXR5KCk7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gYXR0YWNrXHJcbiAgICBmdW5jdGlvbiBhdHRhY2soZV86IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IG1vdXNlQnV0dG9uID0gZV8uYnV0dG9uO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1vdXNlQnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9sZWZ0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuYXR0YWNrXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKG1vdXNlUG9zaXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlVG9Nb3VzZShlXyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5jbGVhcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5hdHRhY2soZGlyZWN0aW9uLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuaGVhdnlBdHRhY2sgb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbn0iLCJuYW1lc3BhY2UgTGV2ZWwge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBMYW5kc2NhcGUgZXh0ZW5kcyDGki5Ob2Rle1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5nZXRDaGlsZHJlbigpWzBdLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSkubXR4TG9jYWwudHJhbnNsYXRlWigtMilcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0ZVREdFL05ldC9CdWlsZC9DbGllbnQvRnVkZ2VDbGllbnQuZC50c1wiLz5cclxuXHJcbm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBlbnVtIEZVTkNUSU9OIHtcclxuICAgICAgICBDT05ORUNURUQsXHJcbiAgICAgICAgU0VUR0FNRVNUQVRFLFxyXG4gICAgICAgIExPQURFRCxcclxuICAgICAgICBIT1NULFxyXG4gICAgICAgIFNFVFJFQURZLFxyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBDTElFTlRNT1ZFTUVOVCxcclxuICAgICAgICBTRVJWRVJCVUZGRVIsXHJcbiAgICAgICAgVVBEQVRFSU5WRU5UT1JZLFxyXG4gICAgICAgIEtOT0NLQkFDS1JFUVVFU1QsXHJcbiAgICAgICAgS05PQ0tCQUNLUFVTSCxcclxuICAgICAgICBTUEFXTkJVTExFVCxcclxuICAgICAgICBCVUxMRVRQUkVESUNULFxyXG4gICAgICAgIEJVTExFVFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVRESUUsXHJcbiAgICAgICAgU1BBV05FTkVNWSxcclxuICAgICAgICBFTkVNWVRSQU5TRk9STSxcclxuICAgICAgICBFTlRJVFlBTklNQVRJT05TVEFURSxcclxuICAgICAgICBFTkVNWURJRSxcclxuICAgICAgICBTUEFXTklOVEVSTkFMSVRFTSxcclxuICAgICAgICBVUERBVEVBVFRSSUJVVEVTLFxyXG4gICAgICAgIFVQREFURVdFQVBPTixcclxuICAgICAgICBJVEVNRElFLFxyXG4gICAgICAgIFNFTkRST09NLFxyXG4gICAgICAgIFNXSVRDSFJPT01SRVFVRVNULFxyXG4gICAgICAgIFVQREFURUJVRkYsXHJcbiAgICAgICAgVVBEQVRFVUlcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IGNsaWVudHM6IEFycmF5PHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfT4gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogSW50ZXJmYWNlcy5OZXR3b3JrT2JqZWN0c1tdID0gW107XHJcblxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0U3Bhd25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgc3Bhd25QbGF5ZXIoKSB9LCB0cnVlKTtcclxuICAgIGxldCBJUENvbm5lY3Rpb24gPSA8SFRNTElucHV0RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklQQ29ubmVjdGlvblwiKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ29ubmVjdGluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29ubmVjdGluZywgdHJ1ZSk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb25uZWN0aW5nKCkge1xyXG4gICAgICAgIGNsaWVudCA9IG5ldyDGkkNsaWVudCgpO1xyXG4gICAgICAgIGNsaWVudC5hZGRFdmVudExpc3RlbmVyKEZ1ZGdlTmV0LkVWRU5ULk1FU1NBR0VfUkVDRUlWRUQsIHJlY2VpdmVNZXNzYWdlKTtcclxuICAgICAgICBjbGllbnQuY29ubmVjdFRvU2VydmVyKElQQ29ubmVjdGlvbi52YWx1ZSk7XHJcblxyXG4gICAgICAgIGFkZENsaWVudElEKClcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gYWRkQ2xpZW50SUQoKSB7XHJcbiAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqOiB7IGlkOiBzdHJpbmcsIHJlYWR5OiBib29sZWFuIH0gPSB7IGlkOiBjbGllbnQuaWQsIHJlYWR5OiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFkZENsaWVudElELCAzMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVjZWl2ZU1lc3NhZ2UoX2V2ZW50OiBDdXN0b21FdmVudCB8IE1lc3NhZ2VFdmVudCB8IEV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKF9ldmVudCBpbnN0YW5jZW9mIE1lc3NhZ2VFdmVudCkge1xyXG4gICAgICAgICAgICBsZXQgbWVzc2FnZTogRnVkZ2VOZXQuTWVzc2FnZSA9IEpTT04ucGFyc2UoX2V2ZW50LmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uTE9BREVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUubG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuaWRTb3VyY2UgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuU0VSVkVSX0hFQVJUQkVBVCAmJiBtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5DTElFTlRfSEVBUlRCRUFUKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9BZGQgbmV3IGNsaWVudCB0byBhcnJheSBjbGllbnRzXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQ09OTkVDVEVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC52YWx1ZSAhPSBjbGllbnQuaWQgJiYgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudCA9PSBtZXNzYWdlLmNvbnRlbnQudmFsdWUpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKHsgaWQ6IG1lc3NhZ2UuY29udGVudC52YWx1ZSwgcmVhZHk6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVRHQU1FU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnBsYXlpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGxheWluZyhmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIW1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBhdXNlKGZhbHNlLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vRlJPTSBDTElFTlQgSU5QVVQgVkVDVE9SUyBGUk9NIEFWQVRBUlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0VmVjdG9yID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0OiBJbnRlcmZhY2VzLklucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmlucHV0LnRpY2ssIGlucHV0VmVjdG9yOiBpbnB1dFZlY3RvciwgZG9lc0FiaWxpdHk6IG1lc3NhZ2UuY29udGVudC5pbnB1dC5kb2VzQWJpbGl0eSB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGVFbnRpdHlUb0NoZWNrKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuc2VydmVyUHJlZGljdGlvbkF2YXRhci5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRPIENMSUVOVCBDQUxDVUxBVEVEIFBPU0lUSU9OIEZPUiBBVkFUQVJcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVJWRVJCVUZGRVIudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0T2JqOiBJbnRlcmZhY2VzLk5ldHdvcmtPYmplY3RzID0gTmV0d29ya2luZy5jdXJyZW50SURzLmZpbmQoZW50aXR5ID0+IGVudGl0eS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGU6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnRpY2ssIHBvc2l0aW9uOiBwb3NpdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0T2JqICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9iaiA9IG5ldE9iai5uZXRPYmplY3ROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+b2JqKS5jbGllbnQub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxCdWxsZXRzLkJ1bGxldD5vYmopLmNsaWVudFByZWRpY3Rpb24ub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy9GUk9NIENMSUVOVCBCVUxMRVQgVkVDVE9SU1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXRWZWN0b3IgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQ6IEludGVyZmFjZXMuSW5wdXRCdWxsZXRQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQudGljaywgaW5wdXRWZWN0b3I6IGlucHV0VmVjdG9yIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRlbXA6IEludGVyZmFjZXMuTmV0d29ya09iamVjdHMgPSBOZXR3b3JraW5nLmN1cnJlbnRJRHMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ZW1wICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0PnRlbXAubmV0T2JqZWN0Tm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLnVwZGF0ZUVudGl0eVRvQ2hlY2sobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5zZXJ2ZXJQcmVkaWN0aW9uLm9uQ2xpZW50SW5wdXQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TZXQgY2xpZW50IHJlYWR5XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUUkVBRFkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5yZWFkeSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYXZhdGFyMiBhcyByYW5nZWQgb3IgbWVsZWUgXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0SWQ6IG51bWJlciA9IG1lc3NhZ2UuY29udGVudC5uZXRJZFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gRW50aXR5LklELk1FTEVFKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyID0gbmV3IFBsYXllci5NZWxlZShFbnRpdHkuSUQuTUVMRUUsIGF0dHJpYnV0ZXMsIG5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLlJhbmdlZChFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzLCBuZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vUnVudGltZSB1cGRhdGVzIGFuZCBjb21tdW5pY2F0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYXZhdGFyMiBwb3NpdGlvbiBhbmQgcm90YXRpb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB0ZXN0OiBHYW1lLsaSLlZlY3RvcjMgPSBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIGNvbnNvbGUubG9nKHRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm90YXRlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbW92ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwucm90YXRpb24gPSByb3RhdGVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNvbGxpZGVyLnBvc2l0aW9uID0gbW92ZVZlY3Rvci50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdhbWUuYXZhdGFyMi5hdmF0YXJQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9VcGRhdGUgaW52ZW50b3J5XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUlOVkVOVE9SWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSXRlbXMuSXRlbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50Lml0ZW1JZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0gPSBuZXcgSXRlbXMuQnVmZkl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgxpIuVmVjdG9yMi5aRVJPKCksIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChJdGVtcy5nZXRJbnRlcm5hbEl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pdGVtSWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShtZXNzYWdlLmNvbnRlbnQuaXRlbUlkLCDGki5WZWN0b3IyLlpFUk8oKSwgbWVzc2FnZS5jb250ZW50Lml0ZW1OZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5pdGVtcy5wdXNoKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0NsaWVudCByZXF1ZXN0IGZvciBtb3ZlIGtub2NrYmFja1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5LTk9DS0JBQ0tSRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteTogRW5lbXkuRW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vSG9zdCBwdXNoIG1vdmUga25vY2tiYWNrIGZyb20gZW5lbXlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUFVTSC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sobWVzc2FnZS5jb250ZW50Lmtub2NrYmFja0ZvcmNlLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gYnVsbGV0IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkJVTExFVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHk6IEVudGl0eS5FbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5vd25lck5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IGVudGl0eS53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQudHlwZSA9PSB3ZWFwb24uYnVsbGV0VHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKDxXZWFwb25zLkFJTT5tZXNzYWdlLmNvbnRlbnQuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IG5ldyBCdWxsZXRzLkJ1bGxldChyZWYubmFtZSwgcmVmLnNwZWVkLCByZWYuaGl0UG9pbnRzU2NhbGUsIHJlZi5saWZldGltZSwgcmVmLmtub2NrYmFja0ZvcmNlLCByZWYua2lsbGNvdW50LCBlbnRpdHkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGRpcmVjaXRvbiwgZW50aXR5Lm5ldElkLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgV2VhcG9ucy5BSU0uSE9NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldFRhcmdldDogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldChyZWYubmFtZSwgcmVmLnNwZWVkLCByZWYuaGl0UG9pbnRzU2NhbGUsIHJlZi5saWZldGltZSwgcmVmLmtub2NrYmFja0ZvcmNlLCByZWYua2lsbGNvdW50LCBlbnRpdHkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGRpcmVjaXRvbiwgZW50aXR5Lm5ldElkLCBidWxsZXRUYXJnZXQsIG1lc3NhZ2UuY29udGVudC5idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGJ1bGxldCB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1JvdGF0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubXR4TG9jYWwucm90YXRpb24gPSBuZXdSb3RhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBidWxsZXQgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVURElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQgPSBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gZW5lbXkgYXQgdGhlIGNsaWVudCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05FTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGNoYW5nZSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBhdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLm5ldHdvcmtTcGF3bkJ5SWQoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmVuZW15Q2xhc3MsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LmlkLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldyDGki5WZWN0b3IyKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJpYnV0ZXMsIG1lc3NhZ2UuY29udGVudC5uZXRJZCwgbWVzc2FnZS5jb250ZW50LnRhcmdldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBlbmVteSB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTkVNWVRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXkgPSBHYW1lLmVuZW1pZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbmVteSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbmVteS5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhbmltYXRpb24gc3RhdGVcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LnN3aXRjaEFuaW1hdGlvbihtZXNzYWdlLmNvbnRlbnQuc3RhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgZW5lbXkgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIEVudGl0eSBidWZmIExpc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQlVGRi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCBidWZmTGlzdDogQnVmZi5CdWZmW10gPSA8QnVmZi5CdWZmW10+bWVzc2FnZS5jb250ZW50LmJ1ZmZMaXN0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0J1ZmZzOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVmZkxpc3QuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKGJ1ZmYuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBCdWZmLkJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWZmcy5wdXNoKG5ldyBCdWZmLkRhbWFnZUJ1ZmYoYnVmZi5pZCwgYnVmZi5kdXJhdGlvbiwgYnVmZi50aWNrUmF0ZSwgKDxCdWZmLkRhbWFnZUJ1ZmY+YnVmZikudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbnQgPT4gZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYnVmZnMuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZmxhZzogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1ZmZzLmZvckVhY2gobmV3QnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWZmLmlkID09IG5ld0J1ZmYuaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZsYWcgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoIWZsYWcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LnJlbW92ZUNoaWxkKGVudGl0eS5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IGJ1ZmYuaWQpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYnVmZnMgPSBuZXdCdWZmcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSBVSVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVVSS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IMaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkocG9zaXRpb24udG9WZWN0b3IzKCksIG1lc3NhZ2UuY29udGVudC52YWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50LmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSwgbWVzc2FnZS5jb250ZW50Lm5ldElkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChJdGVtcy5nZXRJbnRlcm5hbEl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50LmlkLCBuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgaXRlbSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVtcEF0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzID0gbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMgPSB0ZW1wQXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5zY2FsZSwgR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuc2NhbGUsIEdhbWUuYXZhdGFyMi5hdHRyaWJ1dGVzLnNjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgd2VhcG9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURVdFQVBPTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zdCB0ZW1wV2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbihtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmNvb2xkb3duVGltZSwgbWVzc2FnZS5jb250ZW50LndlYXBvbi5hdHRhY2tDb3VudCwgbWVzc2FnZS5jb250ZW50LndlYXBvbi5idWxsZXRUeXBlLCBtZXNzYWdlLmNvbnRlbnQud2VhcG9uLnByb2plY3RpbGVBbW91bnQsIG1lc3NhZ2UuY29udGVudC53ZWFwb24ub3duZXIsIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYWltVHlwZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+R2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpKS53ZWFwb24gPSB0ZW1wV2VhcG9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uSVRFTURJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVuZW0gPT4gKDxJdGVtcy5JdGVtPmVuZW0pLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wSUQobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBzZW5kIGlzIGhvc3RNZXNzYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkhPU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc29tZW9uZUlzSG9zdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHJvb20gXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFTkRST09NLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb29yZGlhbnRlczogR2FtZS7Gki5WZWN0b3IyID0gbmV3IEdhbWUuxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucm9vbS5jb29yZGluYXRlcy5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS5jb29yZGluYXRlcy5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB0YW5zbGF0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb29tLnRyYW5zbGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb29tLnRyYW5zbGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb29tLnRyYW5zbGF0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvb206IEludGVyZmFjZXMuUm9vbSA9IHsgY29vcmRpbmF0ZXM6IGNvb3JkaWFudGVzLCBkaXJlY3Rpb246IG1lc3NhZ2UuY29udGVudC5yb29tLmRpcmVjdGlvbiwgZXhpdHM6IG1lc3NhZ2UuY29udGVudC5yb29tLmV4aXRzLCByb29tVHlwZTogbWVzc2FnZS5jb250ZW50LnJvb20ucm9vbVR5cGUsIHRyYW5zbGF0aW9uOiB0YW5zbGF0aW9uIH07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Jvb206IEdlbmVyYXRpb24uUm9vbSA9IG5ldyBHZW5lcmF0aW9uLlJvb20oXCJyb29tXCIsIHJvb20uY29vcmRpbmF0ZXMsIHJvb20uZXhpdHMsIHJvb20ucm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHJvb20udHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tLmFkZFdhbGxzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tLnNldERvb3JzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb20uZGlyZWN0aW9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLmFkZFJvb21Ub0dyYXBoKG5ld1Jvb20sIHJvb20uZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5hZGRSb29tVG9HcmFwaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcmVxdWVzdCB0byBzd2l0Y2ggcm9vbXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgR2FtZS7Gki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5jb29yZGlhbnRlcy5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMuZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY3VycmVudHJvb20gPSBHZW5lcmF0aW9uLnJvb21zLmZpbmQoZWxlbSA9PiBlbGVtLmNvb3JkaW5hdGVzLmVxdWFscyhjb29yZGlhbnRlcykpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uc3dpdGNoUm9vbShjdXJyZW50cm9vbSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnRSZWFkeSgpIHtcclxuICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IGNsaWVudC5pZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVFJFQURZLCBuZXRJZDogY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldEdhbWVzdGF0ZShfcGxheWluZzogYm9vbGVhbikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VUR0FNRVNUQVRFLCBwbGF5aW5nOiBfcGxheWluZyB9IH0pO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcGxheWVyXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0SG9zdCgpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSE9TVCwgaWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgICAgICAgICBpZiAoIXNvbWVvbmVJc0hvc3QpIHtcclxuICAgICAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICBzb21lb25lSXNIb3N0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9hZGVkKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkxPQURFRCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blBsYXllcigpIHtcclxuICAgICAgICBpZiAoR2FtZS5hdmF0YXIxLmlkID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELk1FTEVFLCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBOZXR3b3JraW5nLkZVTkNUSU9OLkNPTk5FQ1RFRCwgdmFsdWU6IE5ldHdvcmtpbmcuY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhclBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5UUkFOU0ZPUk0sIHZhbHVlOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZENsaWVudElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0QXZhdGFyUGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULCBuZXRJZDogX25ldElkLCBpbnB1dDogX2lucHV0UGF5bG9hZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRTZXJ2ZXJCdWZmZXIoX25ldElkOiBudW1iZXIsIF9idWZmZXI6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFUlZFUkJVRkZFUiwgbmV0SWQ6IF9uZXRJZCwgYnVmZmVyOiBfYnVmZmVyIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1JlcXVlc3QoX25ldElkOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1JFUVVFU1QsIG5ldElkOiBfbmV0SWQsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tQdXNoKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVJbnZlbnRvcnkoX2l0ZW1JZDogSXRlbXMuSVRFTUlELCBfaXRlbU5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIGl0ZW1JZDogX2l0ZW1JZCwgaXRlbU5ldElkOiBfaXRlbU5ldElkLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBidWxsZXRcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkJ1bGxldChfYWltVHlwZTogV2VhcG9ucy5BSU0sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYnVsbGV0VGFyZ2V0PzogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVULCBhaW1UeXBlOiBfYWltVHlwZSwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uLCBvd25lck5ldElkOiBfb3duZXJOZXRJZCwgYnVsbGV0TmV0SWQ6IF9idWxsZXROZXRJZCwgYnVsbGV0VGFyZ2V0OiBfYnVsbGV0VGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZEJ1bGxldElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBlbmVteVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9lbmVteTogRW5lbXkuRW5lbXksIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15Q2xhc3M6IF9lbmVteUNsYXNzLCBpZDogX2VuZW15LmlkLCBhdHRyaWJ1dGVzOiBfZW5lbXkuYXR0cmlidXRlcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IF9uZXRJZCwgdGFyZ2V0OiBfZW5lbXkudGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW5lbXlQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKF9zdGF0ZTogRW50aXR5LkFOSU1BVElPTlNUQVRFUywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0sIF9pZDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLCBpdGVtOiBfaXRlbSwgaWQ6IF9pZCwgcG9zaXRpb246IF9wb3NpdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgYXR0cmlidXRlczogX2F0dHJpYnV0ZXMsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIGF0dHJpYnV0ZXM6IF9hdHRyaWJ1dGVzLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhcldlYXBvbihfd2VhcG9uOiBXZWFwb25zLldlYXBvbiwgX3RhcmdldE5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uLCBuZXRJZDogX3RhcmdldE5ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVJdGVtKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uIGJ1ZmZzXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVmZkxpc3QoX2J1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQlVGRiwgYnVmZkxpc3Q6IF9idWZmTGlzdCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBVSVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVVSSwgcG9zaXRpb246IF9wb3NpdGlvbiwgdmFsdWU6IF92YWx1ZSB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcm9vbVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRSb29tKF9yb29tOiBJbnRlcmZhY2VzLlJvb20pIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VORFJPT00sIHJvb206IF9yb29tIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3dpdGNoUm9vbVJlcXVlc3QoX2Nvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IEludGVyZmFjZXMuUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULCBjb29yZGlhbnRlczogX2Nvb3JkaWFudGVzLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcihfb2JqZWN0OiBPYmplY3QpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IGlkKSkge1xyXG4gICAgICAgICAgICBpZEdlbmVyYXRvcihfb2JqZWN0KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGN1cnJlbnRJRHMucHVzaCg8SW50ZXJmYWNlcy5OZXR3b3JrT2JqZWN0cz57IG5ldElkOiBpZCwgbmV0T2JqZWN0Tm9kZTogX29iamVjdCB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJldHVybiBpZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcG9wSUQoX2lkOiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgaW5kZXg6IG51bWJlcjtcclxuICAgICAgICBjdXJyZW50SURzID0gY3VycmVudElEcy5maWx0ZXIoZWxlbSA9PiBlbGVtLm5ldElkICE9IF9pZClcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbig2LCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbGllbnQ6IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbjtcclxuICAgICAgICByZWFkb25seSBhYmlsaXR5Q291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY3VycmVudGFiaWxpdHlDb3VudDogbnVtYmVyID0gdGhpcy5hYmlsaXR5Q291bnQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuUExBWUVSO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudCA9IG5ldyBOZXR3b3JraW5nLkNsaWVudFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkb29yczogR2VuZXJhdGlvbi5Eb29yW10gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlJPT00pKS5kb29ycztcclxuICAgICAgICAgICAgZG9vcnMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxHZW5lcmF0aW9uLkRvb3I+ZWxlbWVudCkuY2hhbmdlUm9vbSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzY2FsZU1vdmVWZWN0b3IoX2RpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgdGhpcyA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKCh0aGlzLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNsaWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZShJbnB1dFN5c3RlbS5tb3ZlKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SXRlbUNvbGxpc2lvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgbGV0IGVuZW1pZXNDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzQ29sbGlkZXIucHVzaChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVDb2xsaWRlcihlbmVtaWVzQ29sbGlkZXIsIF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1Db2xsaXNpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtQ29sbGlkZXI6IEl0ZW1zLkl0ZW1bXSA9IEdhbWUuaXRlbXM7XHJcbiAgICAgICAgICAgIGl0ZW1Db2xsaWRlci5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoaXRlbS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShpdGVtLmlkLCBpdGVtLm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmRvWW91clRoaW5nKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkludGVybmFsSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5CdWZmSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArIEJ1ZmYuQlVGRklEWyg8SXRlbXMuQnVmZkl0ZW0+aXRlbSkuYnVmZlswXS5pZF0udG9TdHJpbmcoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gKDxFbmVteS5FbmVteT5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGJsb2NrOiBBYmlsaXR5LkJsb2NrID0gbmV3IEFiaWxpdHkuQmxvY2sodGhpcy5uZXRJZCwgNjAwLCAxLCA1ICogNjApO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCwgX3N5bmMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9CbG9ja1xyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG5cclxuICAgICAgICBwdWJsaWMgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCAxNTAsIDEsIDUgKiA2MCwgMik7XHJcbiAgICAgICAgcGVyZm9ybUFiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsYXN0TW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUodGhpcy5sYXN0TW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0Rhc2hcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG4gICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U3RhcnRSb29tOiBHYW1lLsaSLlRleHR1cmVJbWFnZSA9IG5ldyBHYW1lLsaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuUk9PTTtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFXHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHVibGljIHdhbGxzOiBXYWxsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgZG9vcnM6IERvb3JbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBmaW5pc2hlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1YmxpYyBlbmVteUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uVXBkYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIG5laWdoYm91ck46IFJvb207XHJcbiAgICAgICAgbmVpZ2hib3VyRTogUm9vbTtcclxuICAgICAgICBuZWlnaGJvdXJTOiBSb29tO1xyXG4gICAgICAgIG5laWdoYm91clc6IFJvb207XHJcbiAgICAgICAgcm9vbVNpemU6IG51bWJlciA9IDMwO1xyXG4gICAgICAgIGV4aXRzOiBJbnRlcmZhY2VzLlJvb21FeGl0czsgLy8gTiBFIFMgV1xyXG4gICAgICAgIG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkO1xyXG4gICAgICAgIGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaCh0aGlzLm1lc2gpO1xyXG4gICAgICAgIHN0YXJ0Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJzdGFydFJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiksIHR4dFN0YXJ0Um9vbSkpO1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIG1lcmNoYW50Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtZXJjaGFudFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKTtcclxuICAgICAgICB0cmVhc3VyZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwidHJlYXN1cmVSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInllbGxvd1wiKSkpO1xyXG4gICAgICAgIGNoYWxsZW5nZVJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiY2hhbGxlbmdlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSk7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuXHJcblxyXG4gICAgICAgIGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbDtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9jb29yZGlhbnRlczogR2FtZS7Gki5WZWN0b3IyLCBfZXhpdHM6IEludGVyZmFjZXMuUm9vbUV4aXRzLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGlhbnRlcztcclxuICAgICAgICAgICAgdGhpcy5leGl0cyA9IF9leGl0cztcclxuICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnN0YXJ0Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMCkgKyAyMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubm9ybWFsUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm1lcmNoYW50Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tU2l6ZSA9IDg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyMCkgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYm9zc1Jvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJvb21TaXplLCB0aGlzLnJvb21TaXplLCAwKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmNvb3JkaW5hdGVzLnggKiB0aGlzLnJvb21TaXplLCB0aGlzLmNvb3JkaW5hdGVzLnkgKiB0aGlzLnJvb21TaXplLCAtMC4wMSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5lbmVteUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWRkV2FsbHMoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgPEludGVyZmFjZXMuUm9vbUV4aXRzPnsgbm9ydGg6IHRydWUsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH0pKTtcclxuICAgICAgICAgICAgdGhpcy53YWxscy5wdXNoKG5ldyBXYWxsKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLnJvb21TaXplLCA8SW50ZXJmYWNlcy5Sb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IHRydWUsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfSkpO1xyXG4gICAgICAgICAgICB0aGlzLndhbGxzLnB1c2gobmV3IFdhbGwodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMucm9vbVNpemUsIDxJbnRlcmZhY2VzLlJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiB0cnVlLCB3ZXN0OiBmYWxzZSB9KSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgPEludGVyZmFjZXMuUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiB0cnVlIH0pKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXREb29ycygpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMubm9ydGgpIHtcclxuICAgICAgICAgICAgICAgIGxldCBleGl0OiBJbnRlcmZhY2VzLlJvb21FeGl0cyA9IHsgbm9ydGg6IHRydWUsIGVhc3Q6IGZhbHNlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGV4aXQsIHRoaXMucm9vbVNpemUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhpdDogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiBmYWxzZSwgZWFzdDogdHJ1ZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29ycy5wdXNoKG5ldyBEb29yKHRoaXMsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBleGl0LCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMuc291dGgpIHtcclxuICAgICAgICAgICAgICAgIGxldCBleGl0OiBJbnRlcmZhY2VzLlJvb21FeGl0cyA9IHsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IHRydWUsIHdlc3Q6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGV4aXQsIHRoaXMucm9vbVNpemUpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy53ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhpdDogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogdHJ1ZSB9O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29ycy5wdXNoKG5ldyBEb29yKHRoaXMsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBleGl0LCB0aGlzLnJvb21TaXplKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLmRvb3JzW2ldKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldFJvb21TaXplKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnJvb21TaXplO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgV2FsbCBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLldBTEw7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgd2FsbFRoaWNrbmVzczogbnVtYmVyID0gMztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF93aWR0aDogbnVtYmVyLCBfZGlyZWN0aW9uOiBJbnRlcmZhY2VzLlJvb21FeGl0cykge1xyXG4gICAgICAgICAgICBzdXBlcihcIldhbGxcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcInJlZFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJyZWRcIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDApO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICs9IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3dpZHRoICsgdGhpcy53YWxsVGhpY2tuZXNzICogMiwgdGhpcy53YWxsVGhpY2tuZXNzLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLndhbGxUaGlja25lc3MsIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICs9IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLnNvdXRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC09IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3dpZHRoICsgdGhpcy53YWxsVGhpY2tuZXNzICogMiwgdGhpcy53YWxsVGhpY2tuZXNzLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLndhbGxUaGlja25lc3MsIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi53ZXN0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54IC09IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRG9vciBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkRPT1I7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZTtcclxuICAgICAgICBwdWJsaWMgZG9vcldpZHRoOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIHB1YmxpYyBkb29yVGhpY2tuZXNzOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHB1YmxpYyBwYXJlbnRSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb246IEludGVyZmFjZXMuUm9vbUV4aXRzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcGFyZW50OiBSb29tLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5Sb29tRXhpdHMsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiRG9vclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnRSb29tID0gX3BhcmVudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICs9IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JXaWR0aCwgdGhpcy5kb29yVGhpY2tuZXNzLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uZWFzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yVGhpY2tuZXNzLCB0aGlzLmRvb3JXaWR0aCwgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLnNvdXRoKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC09IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JXaWR0aCwgdGhpcy5kb29yVGhpY2tuZXNzLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yVGhpY2tuZXNzLCB0aGlzLmRvb3JXaWR0aCwgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2hhbmdlUm9vbSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKHRoaXMucGFyZW50Um9vbSwgdGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zd2l0Y2hSb29tUmVxdWVzdCh0aGlzLnBhcmVudFJvb20uY29vcmRpbmF0ZXMsIHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuXHJcbiAgICBsZXQgbnVtYmVyT2ZSb29tczogbnVtYmVyID0gMztcclxuICAgIGxldCB1c2VkUG9zaXRpb25zOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCByb29tczogUm9vbVtdID0gW107XHJcblxyXG4gICAgLy9zcGF3biBjaGFuY2VzXHJcbiAgICBsZXQgY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAzMDtcclxuICAgIGxldCB0cmVhc3VyZVJvb21TcGF3bkNoYW5jZTogbnVtYmVyID0gMTAwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIGxldCBzdGFydENvb3JkczogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuXHJcbiAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbShcInJvb21TdGFydFwiLCBzdGFydENvb3JkcywgY2FsY1BhdGhFeGl0cyhzdGFydENvb3JkcyksIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQpKVxyXG4gICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChzdGFydENvb3Jkcyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBudW1iZXJPZlJvb21zOyBpKyspIHtcclxuICAgICAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDFdLCBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1MpO1xyXG4gICAgICAgIGFkZFNwZWNpYWxSb29tcygpO1xyXG4gICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gM10sIEdlbmVyYXRpb24uUk9PTVRZUEUuTUVSQ0hBTlQpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUm9vbURvb3JzKHJvb20pO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhyb29tLmNvb3JkaW5hdGVzICsgXCIgXCIgKyByb29tLmV4aXRzICsgXCIgXCIgKyByb29tLnJvb21UeXBlLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIHBsYWNlUm9vbXNMb2NhbChyb29tc1swXSk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgcm9vbXNbaV0uc2V0RG9vcnMoKTtcclxuICAgICAgICAgICAgcm9vbXNbaV0uYWRkV2FsbHMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZFJvb21Ub0dyYXBoKHJvb21zWzBdKTtcclxuICAgICAgICBzZW5kUm9vbSg8SW50ZXJmYWNlcy5Sb29tPnsgY29vcmRpbmF0ZXM6IHJvb21zWzBdLmNvb3JkaW5hdGVzLCBkaXJlY3Rpb246IG51bGwsIGV4aXRzOiByb29tc1swXS5leGl0cywgcm9vbVR5cGU6IHJvb21zWzBdLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogcm9vbXNbMF0ubXR4TG9jYWwudHJhbnNsYXRpb24gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxhY2VSb29tc0xvY2FsKF9maXJzdFJvb206IFJvb20pIHtcclxuICAgICAgICBpZiAoX2ZpcnN0Um9vbS5uZWlnaGJvdXJOICE9IHVuZGVmaW5lZCAmJiAhX2ZpcnN0Um9vbS5uZWlnaGJvdXJOLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBfZmlyc3RSb29tLm5laWdoYm91ck4ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfZmlyc3RSb29tLm5laWdoYm91ck4uY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIF9maXJzdFJvb20ubmVpZ2hib3VyTi5yb29tU2l6ZSAvIDIpLCBfZmlyc3RSb29tLm5laWdoYm91ck4uY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIF9maXJzdFJvb20ubmVpZ2hib3VyTi5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIF9maXJzdFJvb20ubmVpZ2hib3VyTi5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBwbGFjZVJvb21zTG9jYWwoX2ZpcnN0Um9vbS5uZWlnaGJvdXJOKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF9maXJzdFJvb20ubmVpZ2hib3VyRSAhPSB1bmRlZmluZWQgJiYgIV9maXJzdFJvb20ubmVpZ2hib3VyRS5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgX2ZpcnN0Um9vbS5uZWlnaGJvdXJFLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX2ZpcnN0Um9vbS5uZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBfZmlyc3RSb29tLm5laWdoYm91ckUucm9vbVNpemUgLyAyKSwgX2ZpcnN0Um9vbS5uZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBfZmlyc3RSb29tLm5laWdoYm91ckUucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBfZmlyc3RSb29tLm5laWdoYm91ckUucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgcGxhY2VSb29tc0xvY2FsKF9maXJzdFJvb20ubmVpZ2hib3VyRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZmlyc3RSb29tLm5laWdoYm91clMgIT0gdW5kZWZpbmVkICYmICFfZmlyc3RSb29tLm5laWdoYm91clMucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIF9maXJzdFJvb20ubmVpZ2hib3VyUy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9maXJzdFJvb20ubmVpZ2hib3VyUy5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgX2ZpcnN0Um9vbS5uZWlnaGJvdXJTLnJvb21TaXplIC8gMiksIF9maXJzdFJvb20ubmVpZ2hib3VyUy5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgX2ZpcnN0Um9vbS5uZWlnaGJvdXJTLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgX2ZpcnN0Um9vbS5uZWlnaGJvdXJTLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHBsYWNlUm9vbXNMb2NhbChfZmlyc3RSb29tLm5laWdoYm91clMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX2ZpcnN0Um9vbS5uZWlnaGJvdXJXICE9IHVuZGVmaW5lZCAmJiAhX2ZpcnN0Um9vbS5uZWlnaGJvdXJXLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBfZmlyc3RSb29tLm5laWdoYm91clcubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfZmlyc3RSb29tLm5laWdoYm91clcuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIF9maXJzdFJvb20ubmVpZ2hib3VyVy5yb29tU2l6ZSAvIDIpLCBfZmlyc3RSb29tLm5laWdoYm91clcuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIF9maXJzdFJvb20ubmVpZ2hib3VyVy5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIF9maXJzdFJvb20ubmVpZ2hib3VyVy5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBwbGFjZVJvb21zTG9jYWwoX2ZpcnN0Um9vbS5uZWlnaGJvdXJXKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2VuZFJvb20oX3Jvb206IEludGVyZmFjZXMuUm9vbSkge1xyXG4gICAgICAgIE5ldHdvcmtpbmcuc2VuZFJvb20oX3Jvb20pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFJvb20oX2N1cnJlbnRSb29tOiBSb29tLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpOiB2b2lkIHtcclxuICAgICAgICBsZXQgbnVtYmVyT2ZFeGl0czogbnVtYmVyID0gY291bnRCb29sKF9jdXJyZW50Um9vbS5leGl0cyk7XHJcbiAgICAgICAgbGV0IHJhbmRvbU51bWJlcjogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKG51bWJlck9mRXhpdHMgLSAxKSk7XHJcbiAgICAgICAgbGV0IHBvc3NpYmxlRXhpdEluZGV4OiBudW1iZXJbXSA9IGdldEV4aXRJbmRleChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGNvbnNvbGUubG9nKF9yb29tVHlwZSArIFwiOiBcIiArIHBvc3NpYmxlRXhpdEluZGV4ICsgXCJfX19fIFwiICsgcmFuZG9tTnVtYmVyKTtcclxuICAgICAgICBsZXQgbmV3Um9vbVBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgbGV0IG5ld1Jvb206IFJvb207XHJcblxyXG4gICAgICAgIHN3aXRjaCAocG9zc2libGVFeGl0SW5kZXhbcmFuZG9tTnVtYmVyXSkge1xyXG4gICAgICAgICAgICBjYXNlIDA6IC8vIG5vcnRoXHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSArIDEpO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20ubmVpZ2hib3VyUyA9IF9jdXJyZW50Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlcy55KTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgUm9vbShcInJvb21Ob3JtYWxcIiwgKG5ld1Jvb21Qb3NpdGlvbiksIGNhbGNQYXRoRXhpdHMobmV3Um9vbVBvc2l0aW9uKSwgX3Jvb21UeXBlKTtcclxuICAgICAgICAgICAgICAgIHJvb21zLnB1c2gobmV3Um9vbSk7XHJcbiAgICAgICAgICAgICAgICBfY3VycmVudFJvb20ubmVpZ2hib3VyRSA9IG5ld1Jvb207XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tLm5laWdoYm91clcgPSBfY3VycmVudFJvb207XHJcbiAgICAgICAgICAgICAgICB1c2VkUG9zaXRpb25zLnB1c2gobmV3Um9vbVBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIDI6IC8vIHNvdXRoXHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSAtIDEpO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20ubmVpZ2hib3VyTiA9IF9jdXJyZW50Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMzogLy93ZXN0XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gMSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkpO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20ubmVpZ2hib3VyRSA9IF9jdXJyZW50Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBfY3VycmVudFJvb20uc2V0Um9vbUNvb3JkaW5hdGVzKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZFNwZWNpYWxSb29tcygpOiB2b2lkIHtcclxuICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICByb29tLmV4aXRzID0gY2FsY1BhdGhFeGl0cyhyb29tLmNvb3JkaW5hdGVzKTtcclxuICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcodHJlYXN1cmVSb29tU3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tKHJvb20sIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkUpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChpc1NwYXduaW5nKGNoYWxsZW5nZVJvb21TcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb20ocm9vbSwgR2VuZXJhdGlvbi5ST09NVFlQRS5DSEFMTEVOR0UpXHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBpc1NwYXduaW5nKF9zcGF3bkNoYW5jZTogbnVtYmVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgbGV0IHggPSBNYXRoLnJhbmRvbSgpICogMTAwO1xyXG4gICAgICAgIGlmICh4IDwgX3NwYXduQ2hhbmNlKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGZ1bmN0aW9uIGNvdW50Qm9vbChfZXhpdHM6IEludGVyZmFjZXMuUm9vbUV4aXRzKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgY291bnRlcjogbnVtYmVyID0gMDtcclxuICAgICAgICBpZiAoX2V4aXRzLm5vcnRoKSB7XHJcbiAgICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF9leGl0cy5lYXN0KSB7XHJcbiAgICAgICAgICAgIGNvdW50ZXIrKztcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF9leGl0cy5zb3V0aCkge1xyXG4gICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZXhpdHMud2VzdCkge1xyXG4gICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBjb3VudGVyO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBJbnRlcmZhY2VzLlJvb21FeGl0cyk6IG51bWJlcltdIHtcclxuICAgICAgICBsZXQgbnVtYmVyczogbnVtYmVyW10gPSBbXTtcclxuICAgICAgICBpZiAoX2V4aXRzLm5vcnRoKSB7XHJcbiAgICAgICAgICAgIG51bWJlcnMucHVzaCgwKVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX2V4aXRzLmVhc3QpIHtcclxuICAgICAgICAgICAgbnVtYmVycy5wdXNoKDEpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfZXhpdHMud2VzdCkge1xyXG4gICAgICAgICAgICBudW1iZXJzLnB1c2goMilcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKF9leGl0cy5zb3V0aCkge1xyXG4gICAgICAgICAgICBudW1iZXJzLnB1c2goMylcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjYWxjdWxhdGVzIHBvc3NpYmxlIGV4aXRzIGZvciBuZXcgcm9vbXNcclxuICAgICAqIEBwYXJhbSBfcG9zaXRpb24gcG9zaXRpb24gb2Ygcm9vbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhbiBmb3IgZWFjaCBkaXJlY3Rpb24gbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XHJcbiAgICAgKi9cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUGF0aEV4aXRzKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyKTogSW50ZXJmYWNlcy5Sb29tRXhpdHMge1xyXG4gICAgICAgIGxldCBleGl0czogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfTtcclxuICAgICAgICBsZXQgcm9vbU5laWdoYm91cnM6IEdhbWUuxpIuVmVjdG9yMltdO1xyXG4gICAgICAgIHJvb21OZWlnaGJvdXJzID0gc2xpY2VOZWlnaGJvdXJzKGdldE5laWdoYm91cnMoX3Bvc2l0aW9uKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV0ueSAtIF9wb3NpdGlvbi55ID09IC0xKSB7XHJcbiAgICAgICAgICAgICAgICBleGl0cy5zb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldLnggLSBfcG9zaXRpb24ueCA9PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgZXhpdHMud2VzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldLnkgLSBfcG9zaXRpb24ueSA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBleGl0cy5ub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldLnggLSBfcG9zaXRpb24ueCA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBleGl0cy5lYXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZXhpdHM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gY2FsY1Jvb21Eb29ycyhfcm9vbTogR2VuZXJhdGlvbi5Sb29tKTogSW50ZXJmYWNlcy5Sb29tRXhpdHMge1xyXG4gICAgICAgIGxldCBleGl0czogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfTtcclxuICAgICAgICBpZiAoX3Jvb20ubmVpZ2hib3VyTiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZXhpdHMubm9ydGggPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX3Jvb20ubmVpZ2hib3VyRSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZXhpdHMuZWFzdCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfcm9vbS5uZWlnaGJvdXJTICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBleGl0cy5zb3V0aCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfcm9vbS5uZWlnaGJvdXJXICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBleGl0cy53ZXN0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGV4aXRzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJzKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyBHYW1lLsaSLlZlY3RvcjIoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55IC0gMSkpOyAvLyBkb3duXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyBHYW1lLsaSLlZlY3RvcjIoX3Bvc2l0aW9uLnggLSAxLCBfcG9zaXRpb24ueSkpOyAvLyBsZWZ0XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyBHYW1lLsaSLlZlY3RvcjIoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55ICsgMSkpOyAvLyB1cFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgR2FtZS7Gki5WZWN0b3IyKF9wb3NpdGlvbi54ICsgMSwgX3Bvc2l0aW9uLnkpKTsgLy8gcmlnaHRcclxuICAgICAgICByZXR1cm4gbmVpZ2hib3VycztcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzbGljZU5laWdoYm91cnMoX25laWdoYm91cnM6IEdhbWUuxpIuVmVjdG9yMltdKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzID0gX25laWdoYm91cnM7XHJcbiAgICAgICAgbGV0IHRvUmVtb3ZlSW5kZXg6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGljaCBwb3NpdGlvbiBhbHJlYWR5IHVzZWRcclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV0ueCA9PSByb29tLnggJiYgbmVpZ2hib3Vyc1tpXS55ID09IHJvb20ueSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRvUmVtb3ZlSW5kZXgucHVzaChpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgbGV0IGNvcHk6IEdhbWUuxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgdG9SZW1vdmVJbmRleC5mb3JFYWNoKGluZGV4ID0+IHtcclxuICAgICAgICAgICAgZGVsZXRlIG5laWdoYm91cnNbaW5kZXhdO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIG5laWdoYm91cnMuZm9yRWFjaChuID0+IHtcclxuICAgICAgICAgICAgY29weS5wdXNoKG4pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBjb3B5O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzd2l0Y2hSb29tKF9jdXJyZW50Um9vbTogUm9vbSwgX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5Sb29tRXhpdHMpIHtcclxuICAgICAgICBpZiAoX2N1cnJlbnRSb29tLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZXhpdHM6IEludGVyZmFjZXMuUm9vbUV4aXRzID0geyBub3J0aDogZmFsc2UsIGVhc3Q6IGZhbHNlLCBzb3V0aDogdHJ1ZSwgd2VzdDogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIHNlbmRSb29tKDxJbnRlcmZhY2VzLlJvb20+eyBjb29yZGluYXRlczogX2N1cnJlbnRSb29tLm5laWdoYm91ck4uY29vcmRpbmF0ZXMsIGRpcmVjdGlvbjogZXhpdHMsIGV4aXRzOiBfY3VycmVudFJvb20ubmVpZ2hib3VyTi5leGl0cywgcm9vbVR5cGU6IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogX2N1cnJlbnRSb29tLm5laWdoYm91ck4ubXR4TG9jYWwudHJhbnNsYXRpb24gfSk7XHJcbiAgICAgICAgICAgICAgICBhZGRSb29tVG9HcmFwaChfY3VycmVudFJvb20ubmVpZ2hib3VyTiwgZXhpdHMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLmVhc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCBleGl0czogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogdHJ1ZSB9O1xyXG4gICAgICAgICAgICAgICAgc2VuZFJvb20oPEludGVyZmFjZXMuUm9vbT57IGNvb3JkaW5hdGVzOiBfY3VycmVudFJvb20ubmVpZ2hib3VyRS5jb29yZGluYXRlcywgZGlyZWN0aW9uOiBleGl0cywgZXhpdHM6IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJFLmV4aXRzLCByb29tVHlwZTogX2N1cnJlbnRSb29tLm5laWdoYm91ckUucm9vbVR5cGUsIHRyYW5zbGF0aW9uOiBfY3VycmVudFJvb20ubmVpZ2hib3VyRS5tdHhMb2NhbC50cmFuc2xhdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJFLCBleGl0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uc291dGgpIHtcclxuICAgICAgICAgICAgICAgIGxldCBleGl0czogSW50ZXJmYWNlcy5Sb29tRXhpdHMgPSB7IG5vcnRoOiB0cnVlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgc2VuZFJvb20oPEludGVyZmFjZXMuUm9vbT57IGNvb3JkaW5hdGVzOiBfY3VycmVudFJvb20ubmVpZ2hib3VyUy5jb29yZGluYXRlcywgZGlyZWN0aW9uOiBleGl0cywgZXhpdHM6IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLmV4aXRzLCByb29tVHlwZTogX2N1cnJlbnRSb29tLm5laWdoYm91clMucm9vbVR5cGUsIHRyYW5zbGF0aW9uOiBfY3VycmVudFJvb20ubmVpZ2hib3VyUy5tdHhMb2NhbC50cmFuc2xhdGlvbiB9KTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLCBleGl0cyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4aXRzOiBJbnRlcmZhY2VzLlJvb21FeGl0cyA9IHsgbm9ydGg6IGZhbHNlLCBlYXN0OiB0cnVlLCBzb3V0aDogZmFsc2UsIHdlc3Q6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbSg8SW50ZXJmYWNlcy5Sb29tPnsgY29vcmRpbmF0ZXM6IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLmNvb3JkaW5hdGVzLCBkaXJlY3Rpb246IGV4aXRzLCBleGl0czogX2N1cnJlbnRSb29tLm5laWdoYm91clcuZXhpdHMsIHJvb21UeXBlOiBfY3VycmVudFJvb20ubmVpZ2hib3VyVy5yb29tVHlwZSwgdHJhbnNsYXRpb246IF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLm10eExvY2FsLnRyYW5zbGF0aW9uIH0pO1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgoX2N1cnJlbnRSb29tLm5laWdoYm91clcsIGV4aXRzKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduRW5lbWllcygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkUm9vbVRvR3JhcGgoX3Jvb206IFJvb20sIF9kaXJlY2l0b24/OiBJbnRlcmZhY2VzLlJvb21FeGl0cykge1xyXG4gICAgICAgIGxldCBvbGRPYmplY3RzOiBHYW1lLsaSLk5vZGVbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5QTEFZRVIpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1swXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1sxXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1syXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1szXSk7XHJcblxyXG4gICAgICAgIGlmIChfZGlyZWNpdG9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IF9yb29tLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5jbG9uZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWNpdG9uICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfZGlyZWNpdG9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3UG9zaXRpb24ueSArPSBfcm9vbS5yb29tU2l6ZSAvIDIgLSAyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKF9kaXJlY2l0b24uZWFzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uLnggKz0gX3Jvb20ucm9vbVNpemUgLyAyIC0gMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChfZGlyZWNpdG9uLnNvdXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3UG9zaXRpb24ueSAtPSBfcm9vbS5yb29tU2l6ZSAvIDIgLSAyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKF9kaXJlY2l0b24ud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uLnggLT0gX3Jvb20ucm9vbVNpemUgLyAyIC0gMjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXdQb3NpdGlvbi56ID0gMDtcclxuXHJcbiAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIF9yb29tLnNldERvb3JzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IF9yb29tLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoX3Jvb20uZG9vcnNbaV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaWYgKF9yb29tLnJvb21UeXBlID09IFJPT01UWVBFLlRSRUFTVVJFICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAvL1RPRE86IGFkZCBFeHRlcm5hbEl0ZW1zIHJhbmRvbVxyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiA9IF9yb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgcG9zaXRpb24ueCAtPSAyO1xyXG4gICAgICAgICAgICBsZXQgcmFuZG9tSXRlbUlkOiBudW1iZXIgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoT2JqZWN0LmtleXMoSXRlbXMuSVRFTUlEKS5sZW5ndGggLyAyIC0gMSkpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0ocmFuZG9tSXRlbUlkLCBwb3NpdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgcG9zaXRpb24ueCArPSA0O1xyXG4gICAgICAgICAgICByYW5kb21JdGVtSWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAoT2JqZWN0LmtleXMoSXRlbXMuSVRFTUlEKS5sZW5ndGggLyAyIC0gMSkpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0ocmFuZG9tSXRlbUlkLCBwb3NpdGlvbikpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBUYWcge1xyXG4gICAgZXhwb3J0IGVudW0gVEFHe1xyXG4gICAgICAgIFBMQVlFUixcclxuICAgICAgICBFTkVNWSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgSVRFTSxcclxuICAgICAgICBST09NLFxyXG4gICAgICAgIFdBTEwsXHJcbiAgICAgICAgRE9PUixcclxuICAgICAgICBEQU1BR0VVSVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFdlYXBvbnMge1xyXG4gICAgZXhwb3J0IGNsYXNzIFdlYXBvbiB7XHJcbiAgICAgICAgb3duZXI6IG51bWJlcjsgZ2V0IF9vd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lcikgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgY29vbGRvd246IEFiaWxpdHkuQ29vbGRvd247XHJcbiAgICAgICAgcHVibGljIGNvb2xkb3duVGltZTogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBhdHRhY2tDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBwdWJsaWMgY3VycmVudEF0dGFja0NvdW50OiBudW1iZXIgPSB0aGlzLmF0dGFja0NvdW50O1xyXG4gICAgICAgIGFpbVR5cGU6IEFJTTtcclxuICAgICAgICBidWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUgPSBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQ7XHJcbiAgICAgICAgcHJvamVjdGlsZUFtb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb2xkb3duVGltZTogbnVtYmVyLCBfYXR0YWNrQ291bnQ6IG51bWJlciwgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX3Byb2plY3RpbGVBbW91bnQ6IG51bWJlciwgX293bmVyTmV0SWQ6IG51bWJlciwgX2FpbVR5cGU6IEFJTSkge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xkb3duVGltZSA9IF9jb29sZG93blRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrQ291bnQgPSBfYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuYnVsbGV0VHlwZSA9IF9idWxsZXRUeXBlO1xyXG4gICAgICAgICAgICB0aGlzLnByb2plY3RpbGVBbW91bnQgPSBfcHJvamVjdGlsZUFtb3VudDtcclxuICAgICAgICAgICAgdGhpcy5vd25lciA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFpbVR5cGUgPSBfYWltVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bih0aGlzLmNvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY2l0b246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPiAwICYmICF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY2l0b24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1bGxldERpcmVjdGlvbihtYWdhemluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maXJlKG1hZ2F6aW5lLCBfc3luYyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0YWNrQ291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24odGhpcy5fb3duZXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiAqIHRoaXMuY29vbGRvd25UaW1lKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IHRoaXMubG9hZE1hZ2F6aW5lKF9wb3NpdGlvbiwgX2RpcmVjaXRvbiwgdGhpcy5idWxsZXRUeXBlLCBfYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maXJlKG1hZ2F6aW5lLCBfc3luYyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGZpcmUoX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgX21hZ2F6aW5lLmZvckVhY2goYnVsbGV0ID0+IHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChidWxsZXQgaW5zdGFuY2VvZiBCdWxsZXRzLkhvbWluZ0J1bGxldCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KHRoaXMuYWltVHlwZSwgYnVsbGV0LmRpcmVjdGlvbiwgYnVsbGV0Lm5ldElkLCB0aGlzLm93bmVyLCAoPEJ1bGxldHMuSG9taW5nQnVsbGV0PmJ1bGxldCkudGFyZ2V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVsbGV0RGlyZWN0aW9uKF9tYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9tYWdhemluZS5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gX21hZ2F6aW5lO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVswXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMik7XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzFdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyICogLTEpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRNYWdhemluZShfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9idWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUsIF9uZXRJZD86IG51bWJlcik6IEJ1bGxldHMuQnVsbGV0W10ge1xyXG4gICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnByb2plY3RpbGVBbW91bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQudHlwZSA9PSBfYnVsbGV0VHlwZSk7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQocmVmLm5hbWUsIHJlZi5zcGVlZCwgcmVmLmhpdFBvaW50c1NjYWxlLCByZWYubGlmZXRpbWUsIHJlZi5rbm9ja2JhY2tGb3JjZSwgcmVmLmtpbGxjb3VudCwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCB0aGlzLm93bmVyLCBfbmV0SWQpKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEFJTS5IT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1hZ2F6aW5lLnB1c2gobmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KHJlZi5uYW1lLCByZWYuc3BlZWQsIHJlZi5oaXRQb2ludHNTY2FsZSwgcmVmLmxpZmV0aW1lLCByZWYua25vY2tiYWNrRm9yY2UsIHJlZi5raWxsY291bnQsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lciwgbnVsbCwgX25ldElkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBtYWdhemluZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEJ1bGxldEJ5QnVsbGV0VHlwZShfdHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFKSB7XHJcbiAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuYnVsbGV0c0pTT04uZmluZChidWxsZXQgPT4gYnVsbGV0LnR5cGUgPT0gX3R5cGUpXHJcblxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQUlNIHtcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgSE9NSU5HXHJcbiAgICB9XHJcblxyXG59Il19