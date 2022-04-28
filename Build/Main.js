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
        }
        Game.graph.appendChild(Game.avatar1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
        Game.cmpCamera.mtxPivot.translation = Game.ƒ.Vector3.ZERO();
        Game.cmpCamera.mtxPivot.translateZ(25);
        Game.cmpCamera.mtxPivot.rotateY(180);
        Game.viewport.initialize("Viewport", Game.graph, Game.cmpCamera, Game.canvas);
        draw();
    }
    function update() {
        Game.deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        draw();
        cameraUpdate();
        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
        }
        Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
        Game.coolDowns.forEach(_cd => {
            _cd.updateCoolDown();
        });
        Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
        if (Game.connected) {
            Game.bullets.forEach(element => {
                element.update();
            });
        }
        let damageUI = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.DAMAGEUI);
        damageUI.forEach(element => {
            element.move();
            element.lifespan(Game.graph);
        });
        Game.entities = Game.graph.getChildren().filter(child => child instanceof Entity.Entity);
        Game.entities.forEach(element => {
            element.updateBuffs();
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                element.update();
            }
        });
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
        Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
        if (Game.currentRoom.enemyCount <= 0) {
            Game.currentRoom.finished = true;
        }
        UI.updateUI();
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
                    if (Networking.client.id == Networking.client.idHost) {
                        EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new Game.ƒ.Vector2(3, 3), null);
                    }
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
        async lifespan(_graph) {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    _graph.removeChild(this);
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
        }
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
            if (_netId != undefined) {
                if (this.netId != undefined) {
                    Networking.popID(this.netId);
                }
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
            }
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.mtxLocal.scale(new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale));
            this.collider = new Collider.Collider(this.cmpTransform.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
        }
        update() {
            this.setCollider();
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
        lifetime;
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
        update() {
            super.update();
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
        update() {
            super.update();
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
        update() {
            super.update();
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
        update() {
            super.update();
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
        update() {
            super.update();
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
        update() {
            super.update();
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
        netId = Networking.idGenerator();
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
                Networking.currentIDs.push(_netId);
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
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
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
            //TODO: implement whole movement calculation inclusive collision
            //do movement 
            let cloneInputVector = input.inputVector.clone;
            if (cloneInputVector.magnitude > 0) {
                cloneInputVector.normalize();
            }
            if (Networking.client.id == Networking.client.idHost && input.doesAbility) {
                this.owner.doAbility();
            }
            this.owner.move(cloneInputVector);
            let newStatePayload = { tick: input.tick, position: this.owner.mtxLocal.translation, doesAbility: input.doesAbility };
            return newStatePayload;
        }
    }
    Networking.Prediction = Prediction;
    class ClientPrediction extends Prediction {
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
    class ServerPrediction extends Prediction {
        inputQueue = new Queue();
        constructor(_ownerNetId) {
            super(_ownerNetId);
        }
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
        }
        endCoolDOwn() {
            Game.coolDowns = Game.coolDowns.filter(cd => cd != this);
            this.hasCoolDown = false;
        }
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
        update() {
            super.update();
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
        tick = 0;
        positions = [];
        hostPositions = [];
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
        async despawn() {
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
                Networking.currentIDs.push(_netId);
                this.netId = _netId;
            }
            else {
                this.netId = Networking.idGenerator();
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
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider = new Collider.Collider(newPosition, this.cmpTransform.mtxLocal.scaling.y / 1.5, this.netId);
            this.updateRotation(_direction);
            this.loadTexture();
            this.flyDirection = ƒ.Vector3.X();
            this.direction = _direction;
            this.owner = _ownerId;
        }
        async update() {
            if (Networking.client.id == Networking.client.idHost) {
                this.cmpTransform.mtxLocal.translate(this.flyDirection);
                if (this._owner == Game.avatar2) {
                    this.bulletPrediction();
                }
                else {
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                }
                this.collisionDetection();
                this.despawn();
            }
            else {
                if (this._owner == Game.avatar1) {
                    this.cmpTransform.mtxLocal.translate(this.flyDirection);
                    this.bulletPrediction();
                }
            }
        }
        doKnockback(_body) {
            _body.getKnockback(this.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        bulletPrediction() {
            this.time += Game.deltaTime;
            while (this.time >= 1) {
                this.positions.push(new ƒ.Vector3(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.translation.z));
                if (Game.connected) {
                    Networking.predictionBullet(this.cmpTransform.mtxLocal.translation, this.netId, this.tick);
                }
                this.tick++;
                this.time -= 1;
            }
            if (Networking.client.id != Networking.client.idHost) {
                if (this.tick >= 1 && this.hostPositions[this.tick - 1] != undefined && this.positions[this.tick - 1] != undefined) {
                    if (this.hostPositions[this.tick - 1].x != this.positions[this.tick - 1].x || this.hostPositions[this.tick - 1].y != this.positions[this.tick - 1].y) {
                        this.correctPosition();
                    }
                }
            }
        }
        async correctPosition() {
            if (this.hostPositions[this.tick] != undefined) {
                this.cmpTransform.mtxLocal.translation = this.hostPositions[this.tick];
            }
            else {
                setTimeout(() => { this.correctPosition; }, 100);
            }
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
        async collisionDetection() {
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
        async loadTexture() {
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
                this.setTarget(Game.avatar2.netId);
            }
        }
        async update() {
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
            this.target = Game.entities.find(ent => ent.netId == _netID).mtxLocal.translation;
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
        FUNCTION[FUNCTION["BULLETPREDICTION"] = 13] = "BULLETPREDICTION";
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
            if (message.command == FudgeNet.COMMAND.SERVER_HEARTBEAT) {
                //TODO: need maurice!
                //TODO: do prediction here?
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
                    //FROM CLIENT 
                    if (message.content != undefined && message.content.text == FUNCTION.CLIENTMOVEMENT.toString()) {
                        let players = Game.entities.filter(entity => entity.tag == Tag.TAG.PLAYER);
                        let entity = players.find(player => player.netId != message.content.netId);
                        let inputVector = new Game.ƒ.Vector3(message.content.input.inputVector.data[0], message.content.input.inputVector.data[1], message.content.input.inputVector.data[2]);
                        let input = { tick: message.content.input.tick, inputVector: inputVector, doesAbility: message.content.input.doesAbility };
                        if (entity != undefined) {
                            entity.server.updateEntityToCheck(message.content.netId);
                            entity.server.onClientInput(input);
                        }
                    }
                    // TO CLIENT
                    if (message.content != undefined && message.content.text == FUNCTION.SERVERBUFFER.toString()) {
                        let entity = Game.entities.find(entity => entity.netId == message.content.netId);
                        let position = new Game.ƒ.Vector3(message.content.buffer.position.data[0], message.content.buffer.position.data[1], message.content.buffer.position.data[2]);
                        let state = { tick: message.content.buffer.tick, position: position, doesAbility: message.content.buffer.doesAbility };
                        if (entity != undefined) {
                            entity.client.onServerMovementState(state);
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
                                bullet.flyDirection.scale(Game.deltaTime * bullet.speed);
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
                        //Predict bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETPREDICTION.toString()) {
                            if (Game.bullets.find(element => element.netId == message.content.netId) != null) {
                                let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                Game.bullets.find(element => element.netId == message.content.netId).hostPositions[message.content.tick] = newPosition;
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
                            let room = new Generation.Room(message.content.name, message.content.coordiantes, message.content.exits, message.content.roomType);
                            if (message.content.direciton != null) {
                                Generation.addRoomToGraph(room, message.content.direciton);
                            }
                            else {
                                Generation.addRoomToGraph(room);
                            }
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            let currentroom = Generation.rooms.find(elem => elem.coordinates[0] == message.content.coordiantes[0] &&
                                elem.coordinates[1] == message.content.coordiantes[1]);
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
    function updateBullet(_position, _rotation, _netId, _tick) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETTRANSFORM, position: _position, rotation: _rotation, netId: _netId, tick: _tick } });
        }
    }
    Networking.updateBullet = updateBullet;
    function predictionBullet(_position, _netId, _tick) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.BULLETPREDICTION, position: _position, netId: _netId, tick: _tick } });
        }
    }
    Networking.predictionBullet = predictionBullet;
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
    function sendRoom(_name, _coordiantes, _exits, _roomType, _direciton) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SENDROOM, name: _name, coordiantes: _coordiantes, exits: _exits, roomType: _roomType, direciton: _direciton } });
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
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        if (Networking.currentIDs.find(curID => curID == id)) {
            idGenerator();
        }
        else {
            Networking.currentIDs.push(id);
        }
        return id;
    }
    Networking.idGenerator = idGenerator;
    function popID(_id) {
        let index;
        for (let i = 0; i < Networking.currentIDs.length; i++) {
            if (Networking.currentIDs[i] == _id) {
                index = i;
                break;
            }
        }
        Networking.currentIDs.splice(index, 1);
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
        weapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        client;
        server;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        constructor(_id, _attributes, _netId) {
            super(_id, _attributes, _netId);
            this.tag = Tag.TAG.PLAYER;
            this.client = new Networking.ClientPrediction(this.netId);
            this.server = new Networking.ServerPrediction(this.netId);
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
                this.server.update();
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
                this.lastMoveDirection = _direction;
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
        coordinates; // X Y
        walls = [];
        doors = [];
        finished = false;
        enemyCount;
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
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(this.coordinates[0] * this.roomSize, this.coordinates[1] * this.roomSize, -0.01);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [true, false, false, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, true, false, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, false, true, false]));
            this.walls.push(new Wall(this.cmpTransform.mtxLocal.translation.toVector2(), this.roomSize, [false, false, false, true]));
        }
        setDoors() {
            if (this.exits[0]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [true, false, false, false], this.roomSize));
            }
            if (this.exits[1]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, true, false, false], this.roomSize));
            }
            if (this.exits[2]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, false, true, false], this.roomSize));
            }
            if (this.exits[3]) {
                this.doors.push(new Door(this, this.cmpTransform.mtxLocal.translation.toVector2(), [false, false, false, true], this.roomSize));
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
            if (_direction[0]) {
                this.cmpTransform.mtxLocal.translation.y += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[1]) {
                this.cmpTransform.mtxLocal.translation.x += _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.wallThickness, _width, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.wallThickness, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[2]) {
                this.cmpTransform.mtxLocal.translation.y -= _width / 2 + this.wallThickness / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(_width + this.wallThickness * 2, this.wallThickness, 0);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.wallThickness, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[3]) {
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
            if (_direction[0]) {
                this.cmpTransform.mtxLocal.translation.y += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[1]) {
                this.cmpTransform.mtxLocal.translation.x += _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorThickness, this.doorWidth, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[2]) {
                this.cmpTransform.mtxLocal.translation.y -= _roomSize / 2;
                this.cmpTransform.mtxLocal.scaling = new Game.ƒ.Vector3(this.doorWidth, this.doorThickness, 0.001);
                this.collider = new Game.ƒ.Rectangle(this.cmpTransform.mtxLocal.translation.x, this.cmpTransform.mtxLocal.translation.y, this.cmpTransform.mtxLocal.scaling.x, this.cmpTransform.mtxLocal.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
            if (_direction[3]) {
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
        let startCoords = [0, 0];
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
        for (let i = 0; i < Generation.rooms.length; i++) {
            Generation.rooms[i].setDoors();
        }
        Game.graph.addChild(Generation.rooms[0]);
        Game.graph.appendChild(Generation.rooms[0].walls[0]);
        Game.graph.appendChild(Generation.rooms[0].walls[1]);
        Game.graph.appendChild(Generation.rooms[0].walls[2]);
        Game.graph.appendChild(Generation.rooms[0].walls[3]);
        for (let i = 0; i < Generation.rooms[0].doors.length; i++) {
            Game.graph.addChild(Generation.rooms[0].doors[i]);
        }
        sendRoom(Generation.rooms[0]);
    }
    Generation.generateRooms = generateRooms;
    function sendRoom(_room, _direciton) {
        Networking.sendRoom(_room.name, _room.coordinates, _room.exits, _room.roomType, _direciton);
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
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] + 1];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourN = newRoom;
                newRoom.neighbourS = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 1: // east
                newRoomPosition = [_currentRoom.coordinates[0] + 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourE = newRoom;
                newRoom.neighbourW = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 2: // south
                newRoomPosition = [_currentRoom.coordinates[0], _currentRoom.coordinates[1] - 1];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourS = newRoom;
                newRoom.neighbourN = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
            case 3: //west
                newRoomPosition = [_currentRoom.coordinates[0] - 1, _currentRoom.coordinates[1]];
                newRoom = new Generation.Room("roomNormal", (newRoomPosition), calcPathExits(newRoomPosition), _roomType);
                Generation.rooms.push(newRoom);
                _currentRoom.neighbourW = newRoom;
                newRoom.neighbourE = _currentRoom;
                usedPositions.push(newRoomPosition);
                break;
        }
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
    function countBool(_bool) {
        let counter = 0;
        _bool.forEach(bool => {
            if (bool) {
                counter++;
            }
        });
        return counter;
    }
    function getExitIndex(_exits) {
        let numbers = [];
        for (let i = 0; i < _exits.length; i++) {
            if (_exits[i]) {
                numbers.push(i);
            }
        }
        return numbers;
    }
    /**
     * calculates possible exits for new rooms
     * @param _position position of room
     * @returns boolean for each direction north, east, south, west
     */
    function calcPathExits(_position) {
        let north = false;
        let east = false;
        let south = false;
        let west = false;
        let roomNeighbours;
        roomNeighbours = sliceNeighbours(getNeighbours(_position));
        for (let i = 0; i < roomNeighbours.length; i++) {
            if (roomNeighbours[i][1] - _position[1] == -1) {
                south = true;
            }
            if (roomNeighbours[i][0] - _position[0] == -1) {
                west = true;
            }
            if (roomNeighbours[i][1] - _position[1] == 1) {
                north = true;
            }
            if (roomNeighbours[i][0] - _position[0] == 1) {
                east = true;
            }
        }
        return [north, east, south, west];
    }
    function calcRoomDoors(_room) {
        let north = false;
        let east = false;
        let south = false;
        let west = false;
        if (_room.neighbourN != undefined) {
            north = true;
        }
        if (_room.neighbourE != undefined) {
            east = true;
        }
        if (_room.neighbourS != undefined) {
            south = true;
        }
        if (_room.neighbourW != undefined) {
            west = true;
        }
        return [north, east, south, west];
    }
    function getNeighbours(_position) {
        let neighbours = [];
        neighbours.push([_position[0], _position[1] - 1]); // down
        neighbours.push([_position[0] - 1, _position[1]]); // left
        neighbours.push([_position[0], _position[1] + 1]); // up
        neighbours.push([_position[0] + 1, _position[1]]); // right
        return neighbours;
    }
    function sliceNeighbours(_neighbours) {
        let neighbours = _neighbours;
        let toRemoveIndex = [];
        for (let i = 0; i < neighbours.length; i++) {
            // check ich position already used
            usedPositions.forEach(room => {
                if (neighbours[i][0] == room[0] && neighbours[i][1] == room[1]) {
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
            if (_direction[0]) {
                sendRoom(_currentRoom.neighbourN, [false, false, true, false]);
                addRoomToGraph(_currentRoom.neighbourN, [false, false, true, false]);
            }
            if (_direction[1]) {
                sendRoom(_currentRoom.neighbourE, [false, false, false, true]);
                addRoomToGraph(_currentRoom.neighbourE, [false, false, false, true]);
            }
            if (_direction[2]) {
                sendRoom(_currentRoom.neighbourS, [true, false, false, false]);
                addRoomToGraph(_currentRoom.neighbourS, [true, false, false, false]);
            }
            if (_direction[3]) {
                sendRoom(_currentRoom.neighbourW, [false, true, false, false]);
                addRoomToGraph(_currentRoom.neighbourW, [false, true, false, false]);
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
        let newPosition = _room.cmpTransform.mtxLocal.translation.clone;
        if (_direciton != null) {
            if (_direciton[0]) {
                newPosition.y += _room.roomSize / 2 - 2;
            }
            if (_direciton[1]) {
                newPosition.x += _room.roomSize / 2 - 2;
            }
            if (_direciton[2]) {
                newPosition.y -= _room.roomSize / 2 - 2;
            }
            if (_direciton[3]) {
                newPosition.x -= _room.roomSize / 2 - 2;
            }
        }
        newPosition.z = 0;
        Game.avatar1.cmpTransform.mtxLocal.translation = newPosition;
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
                bullet.flyDirection.scale(Game.deltaTime * bullet.speed);
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
    }
    Weapons.Weapon = Weapon;
    let AIM;
    (function (AIM) {
        AIM[AIM["NORMAL"] = 0] = "NORMAL";
        AIM[AIM["HOMING"] = 1] = "HOMING";
    })(AIM = Weapons.AIM || (Weapons.AIM = {}));
})(Weapons || (Weapons = {}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL0VudGl0eS50cyIsIi4uL0NsYXNzZXMvRW5lbXkudHMiLCIuLi9DbGFzc2VzL0ludGVyZmFjZXMudHMiLCIuLi9DbGFzc2VzL0l0ZW1zLnRzIiwiLi4vQ2xhc3Nlcy9BbmltYXRpb25HZW5lcmF0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9QcmVkaWN0aW9uLnRzIiwiLi4vQ2xhc3Nlcy9BYmlsaXR5LnRzIiwiLi4vQ2xhc3Nlcy9BdHRyaWJ1dGVzLnRzIiwiLi4vQ2xhc3Nlcy9Cb3NzLnRzIiwiLi4vQ2xhc3Nlcy9CdWZmLnRzIiwiLi4vQ2xhc3Nlcy9CdWxsZXQudHMiLCIuLi9DbGFzc2VzL0NvbGxpZGVyLnRzIiwiLi4vQ2xhc3Nlcy9FbmVteVNwYXduZXIudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvVGFnLnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBNlliO0FBbFpELG1CQUFtQjtBQUNuQix3REFBd0Q7QUFDeEQsc0RBQXNEO0FBQ3RELHNCQUFzQjtBQUV0QixXQUFVLElBQUk7SUFDVixJQUFZLFVBR1g7SUFIRCxXQUFZLFVBQVU7UUFDbEIsaURBQU8sQ0FBQTtRQUNQLDZDQUFLLENBQUE7SUFDVCxDQUFDLEVBSFcs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TSxVQUFVLEdBQXNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDOzRCQUNqRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3BFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQzlILElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQzt5QkFDckM7NkJBQU0sSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksSUFBSSxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRTs0QkFDakQsTUFBTSxVQUFVLEdBQXNCLE9BQU8sQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFBOzRCQUNoRSxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE1BQU0sRUFBRSxVQUFVLEVBQUUsS0FBSyxDQUFDLENBQUM7NEJBQ3RFLElBQUksQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLFdBQVcsR0FBRyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxPQUFPLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7NEJBQzlILElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFD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U0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsS0FBSyxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztZQUMxSCxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDLFFBQVEsQ0FBQyxXQUFXLENBQUMsU0FBUyxFQUFFLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5SCxDQUFDO1FBRU0sUUFBUTtZQUNYLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDZixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLElBQUksQ0FBQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxFQUFFLENBQUMsSUFBSSxFQUFFLEtBQUssRUFBRSxLQUFLLEVBQUUsS0FBSyxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEs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QUssRUFBRSxJQUFJLEVBQUUsTUFBTSxDQUFDLENBQUMsQ0FBQzt3QkFDbkwsTUFBTTtpQkFDYjthQUNKO1lBQ0QsT0FBTyxRQUFRLENBQUM7UUFDcEIsQ0FBQztLQUNKO0lBN0ZZLGNBQU0sU0E2RmxCLENBQUE7SUFFRCxJQUFZLEdBR1g7SUFIRCxXQUFZLEdBQUc7UUFDWCxpQ0FBTSxDQUFBO1FBQ04saUNBQU0sQ0FBQTtJQUNWLENBQUMsRUFIVyxHQUFHLEdBQUgsV0FBRyxLQUFILFdBQUcsUUFHZDtBQUVMLENBQUMsRUFyR1MsT0FBTyxLQUFQLE9BQU8sUUFxR2hCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcblxyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBkZWx0YVRpbWU6IG51bWJlcjtcclxuXHJcbiAgICBleHBvcnQgbGV0IGVudGl0aWVzOiBFbnRpdHkuRW50aXR5W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvb2xEb3duczogQWJpbGl0eS5Db29sZG93bltdID0gW107XHJcbiAgICAvL0pTT05cclxuICAgIGV4cG9ydCBsZXQgZW5lbWllc0pTT046IEVudGl0eS5FbnRpdHlbXTtcclxuICAgIGV4cG9ydCBsZXQgaW50ZXJuYWxJdGVtSlNPTjogSXRlbXMuSW50ZXJuYWxJdGVtW107XHJcbiAgICBleHBvcnQgbGV0IGJ1ZmZJdGVtSlNPTjogSXRlbXMuQnVmZkl0ZW1bXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHNKU09OOiBCdWxsZXRzLkJ1bGxldFtdO1xyXG4gICAgZXhwb3J0IGxldCBsb2FkZWQgPSBmYWxzZTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcbiAgICBjb25zdCBkYW1wZXI6IG51bWJlciA9IDMuNTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcblxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgR2VuZXJhdGlvbi5nZW5lcmF0ZVJvb21zKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChhdmF0YXIxKTtcclxuXHJcbiAgICAgICAgxpJBaWQuYWRkU3RhbmRhcmRMaWdodENvbXBvbmVudHMoZ3JhcGgpO1xyXG5cclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlWigyNSk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnJvdGF0ZVkoMTgwKTtcclxuXHJcbiAgICAgICAgdmlld3BvcnQuaW5pdGlhbGl6ZShcIlZpZXdwb3J0XCIsIGdyYXBoLCBjbXBDYW1lcmEsIGNhbnZhcyk7XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgZGVsdGFUaW1lID0gR2FtZS7Gki5Mb29wLnRpbWVGcmFtZUdhbWUgKiAwLjAwMTtcclxuICAgICAgICBwYXVzZUNoZWNrKCk7XHJcblxyXG4gICAgICAgIEdhbWUuYXZhdGFyMS5wcmVkaWN0KCk7XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuXHJcbiAgICAgICAgY2FtZXJhVXBkYXRlKCk7XHJcblxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJQb3NpdGlvbihHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpdGVtcyA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuSVRFTSlcclxuICAgICAgICBjb29sRG93bnMuZm9yRWFjaChfY2QgPT4ge1xyXG4gICAgICAgICAgICBfY2QudXBkYXRlQ29vbERvd24oKTtcclxuICAgICAgICB9KVxyXG4gICAgICAgIGJ1bGxldHMgPSA8QnVsbGV0cy5CdWxsZXRbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8QnVsbGV0cy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuQlVMTEVUKVxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBidWxsZXRzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbGVtZW50LnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbGV0IGRhbWFnZVVJOiBVSS5EYW1hZ2VVSVtdID0gPFVJLkRhbWFnZVVJW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFVJLkRhbWFnZVVJPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkRBTUFHRVVJKVxyXG4gICAgICAgIGRhbWFnZVVJLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQubW92ZSgpO1xyXG4gICAgICAgICAgICBlbGVtZW50LmxpZmVzcGFuKGdyYXBoKTtcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBlbnRpdGllcyA9IDxFbnRpdHkuRW50aXR5W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoY2hpbGQgPT4gKDxFbnRpdHkuRW50aXR5PmNoaWxkKSBpbnN0YW5jZW9mIEVudGl0eS5FbnRpdHkpO1xyXG4gICAgICAgIGVudGl0aWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgIGVsZW1lbnQudXBkYXRlQnVmZnMoKTtcclxuICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgZWxlbWVudC51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGVuZW1pZXMgPSA8RW5lbXkuRW5lbXlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpXHJcblxyXG4gICAgICAgIGN1cnJlbnRSb29tID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbSA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtKS50YWcgPT0gVGFnLlRBRy5ST09NKSk7XHJcbiAgICAgICAgaWYgKGN1cnJlbnRSb29tLmVuZW15Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICBjdXJyZW50Um9vbS5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBVSS51cGRhdGVVSSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5yZWFkeVN0YXRlID09IE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5PUEVOKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50KCk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgc2V0Q2xpZW50KCkgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcmVhZHlTYXRlKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID49IDIgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNldENsaWVudFJlYWR5KCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHJlYWR5U2F0ZSgpIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHN0YXJ0TG9vcCgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIGF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcubG9hZGVkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChHYW1lLmxvYWRlZCkge1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0YXJ0KMaSLkxPT1BfTU9ERS5USU1FX0dBTUUsIGRlbHRhVGltZSk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XHJcbiAgICAgICAgbG9hZFRleHR1cmVzKCk7XHJcbiAgICAgICAgbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBhZGQgc3ByaXRlIHRvIGdyYXBoZSBmb3Igc3RhcnRzY3JlZW5cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0R2FtZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgTmV0d29ya2luZy5jb25uZWN0aW5nKCk7XHJcblxyXG4gICAgICAgICAgICB3YWl0T25Db25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIHdhaXRPbkNvbm5lY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklNSE9TVFwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBhd2FpdCBpbml0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgZ2FtZXN0YXRlID0gR0FNRVNUQVRFUy5QTEFZSU5HO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bkVuZW1pZXMoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1IsIEVudGl0eS5JRC5TVU1NT05PUiwgbmV3IMaSLlZlY3RvcjIoMywgMyksIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8jcmVnaW9uIGluaXQgSXRlbXNcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZW0xID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKEl0ZW1zLklURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUCwgbmV3IMaSLlZlY3RvcjIoMCwgMiksIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTIgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5QUk9KRUNUSUxFU1VQLCBuZXcgxpIuVmVjdG9yMigwLCAtMiksIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTMgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5IT01FQ09NSU5HLCBuZXcgxpIuVmVjdG9yMigtMiwgMCksIG51bGwpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0xKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChpdGVtMyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduUGxheWVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHN0YXJ0TG9vcCgpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KHdhaXRPbkNvbm5lY3Rpb24sIDMwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIE5ldHdvcmtpbmcuc2V0SG9zdCk7XHJcblxyXG4gICAgICAgICAgICB3YWl0Rm9ySG9zdCgpO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiB3YWl0Rm9ySG9zdCgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID49IDIpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhaXRGb3JMb2JieSgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID4gMSAmJiBOZXR3b3JraW5nLmNsaWVudC5wZWVyc1tOZXR3b3JraW5nLmNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpLmlkXSAhPSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgICAgICAgICAoTmV0d29ya2luZy5jbGllbnQucGVlcnNbTmV0d29ya2luZy5jbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKS5pZF0uZGF0YUNoYW5uZWwgIT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChOZXR3b3JraW5nLmNsaWVudC5wZWVyc1tOZXR3b3JraW5nLmNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpLmlkXS5kYXRhQ2hhbm5lbC5yZWFkeVN0YXRlID09IFwib3BlblwiKSkpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JMb2JieSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tDcmVkaXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheWVyQ2hvaWNlKF9lOiBFdmVudCkge1xyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJSYW5nZWRcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5SYW5nZWQoRW50aXR5LklELlJBTkdFRCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKDEwMDAwLCA1LCA1LCAxLCAyLCA1KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJNZWxlZVwiKSB7XHJcbiAgICAgICAgICAgIGF2YXRhcjEgPSBuZXcgUGxheWVyLk1lbGVlKEVudGl0eS5JRC5NRUxFRSwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKDEwMDAwLCAxLCA1LCAxLCAyLCAxMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXVzZUNoZWNrKCkge1xyXG4gICAgICAgIGlmICgod2luZG93LnNjcmVlblggPCAtd2luZG93LnNjcmVlbi5hdmFpbFdpZHRoKSAmJiAod2luZG93LnNjcmVlblkgPCAtd2luZG93LnNjcmVlbi5hdmFpbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgcGF1c2UodHJ1ZSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcGxheWluZyh0cnVlLCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwYXVzZShfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0R2FtZXN0YXRlKGZhbHNlKTtcclxuICAgICAgICAgICAgfSBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFjayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIGxldCBiYWNrQ2xvbmUgPSBiYWNrLmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBiYWNrLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGJhY2tDbG9uZSwgYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0b3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBsYXlpbmcoX3N5bmM6IGJvb2xlYW4sIF90cmlnZ2VyT3B0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGdhbWVzdGF0ZSA9PSBHQU1FU1RBVEVTLlBBVVNFKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF90cmlnZ2VyT3B0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgIMaSLkxvb3AuY29udGludWUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEpTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZEVuZW15ID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvRW5lbWllc1N0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGVuZW1pZXNKU09OID0gKDxFbnRpdHkuRW50aXR5W10+bG9hZEVuZW15LmVuZW1pZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkSXRlbSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0l0ZW1TdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBpbnRlcm5hbEl0ZW1KU09OID0gKDxJdGVtcy5JbnRlcm5hbEl0ZW1bXT5sb2FkSXRlbS5pbnRlcm5hbEl0ZW1zKTtcclxuICAgICAgICBidWZmSXRlbUpTT04gPSAoPEl0ZW1zLkJ1ZmZJdGVtW10+bG9hZEl0ZW0uYnVmZkl0ZW1zKTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRCdWxsZXRzID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvQnVsbGV0U3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgYnVsbGV0c0pTT04gPSAoPEJ1bGxldHMuQnVsbGV0W10+bG9hZEJ1bGxldHMuc3RhbmRhcmRCdWxsZXRzKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBHZW5lcmF0aW9uLnR4dFN0YXJ0Um9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUm9vbXMvbWFwMDEucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvYXJyb3cwMS5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUb3cubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU0LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGaXZlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU2LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU3LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRFaWdodC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU4LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxMC5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUkgcGFydGljbGVcclxuICAgICAgICBhd2FpdCBVSS5oZWFsUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9oZWFsaW5nLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5wb2lzb25QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3BvaXNvbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYnVyblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5ibGVlZGluZ1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvYmxlZWRpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnNsb3dQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3Nsb3cucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgLy9FTkVNWVxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0QmF0SWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9iYXQvYmF0SWRsZS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0UmVkVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvdGljay9yZWRUaWNrSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tXYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTbWFsbFRpY2tJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NtYWxsVGljay9zbWFsbFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja1dhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNrZWxldG9uSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9za2VsZXRvbi9za2VsZXRvbklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25XYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlcklkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvb2dlci9vZ2VySWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VyV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJXYWxrLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJBdHRhY2subG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvb2dlci9vZ2VyQXR0YWNrLnBuZ1wiKTtcclxuXHJcblxyXG5cclxuICAgICAgICAvL0l0ZW1zXHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SWNlQnVja2V0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9pY2VCdWNrZXQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dEhlYWx0aFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9oZWFsdGhVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0VG94aWNSZWxhdGlvbnNoaXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL3RveGljUmVsYXRpb25zaGlwLnBuZ1wiKTtcclxuXHJcblxyXG4gICAgICAgIEFuaW1hdGlvbkdlbmVyYXRpb24uZ2VuZXJhdGVBbmltYXRpb25PYmplY3RzKCk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZHJhdygpOiB2b2lkIHtcclxuICAgICAgICB2aWV3cG9ydC5kcmF3KCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbWVyYVVwZGF0ZSgpIHtcclxuICAgICAgICBsZXQgZGlyZWN0aW9uID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKGF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoZGVsdGFUaW1lICogZGFtcGVyKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoYXZhdGFyMS5jbGllbnQubWluVGltZUJldHdlZW5UaWNrcyAqIGRhbXBlcik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjMoLWRpcmVjdGlvbi54LCBkaXJlY3Rpb24ueSwgMCksIHRydWUpO1xyXG4gICAgfVxyXG5cclxuICAgIMaSLkxvb3AuYWRkRXZlbnRMaXN0ZW5lcijGki5FVkVOVC5MT09QX0ZSQU1FLCB1cGRhdGUpO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuXHJcbn1cclxuIiwibmFtZXNwYWNlIFVJIHtcclxuICAgIC8vbGV0IGRpdlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlVJXCIpO1xyXG4gICAgbGV0IHBsYXllcjFVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIxXCIpO1xyXG4gICAgbGV0IHBsYXllcjJVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJQbGF5ZXIyXCIpO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVVSSgpIHtcclxuICAgICAgICAvL0F2YXRhcjEgVUlcclxuICAgICAgICAoPEhUTUxEaXZFbGVtZW50PnBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0hQXCIpKS5zdHlsZS53aWR0aCA9IChHYW1lLmF2YXRhcjEuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLyBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAxMDApICsgXCIlXCI7XHJcblxyXG4gICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICBHYW1lLmF2YXRhcjEuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBpZiAoZWxlbWVudC5pbWdTcmMgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy9zZWFyY2ggRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICBwbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbWdOYW1lID0gZWxlbWVudC5pbWdTcmMuc3BsaXQoXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpbWdFbGVtZW50LnNyYy5zcGxpdChcIi9cIikuZmluZChlbGVtID0+IGVsZW0gPT0gaW1nTmFtZVtpbWdOYW1lLmxlbmd0aCAtIDFdKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICBpZiAoIWV4c2lzdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHBsYXllcjFVSS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG5cclxuICAgICAgICAvL0F2YXRhcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjIuaXRlbXMuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikucXVlcnlTZWxlY3RvckFsbChcImltZ1wiKS5mb3JFYWNoKChpbWdFbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbWdOYW1lID0gZWxlbWVudC5pbWdTcmMuc3BsaXQoXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zcmMgPSBlbGVtZW50LmltZ1NyYztcclxuICAgICAgICAgICAgICAgICAgICBwbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNJbnZlbnRvcnlcIikuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFplcm86IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T25lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRvdzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUaHJlZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGb3VyOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZpdmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2l4OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNldmVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEVpZ2h0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE5pbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGVuOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZVVJIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuREFNQUdFVUk7XHJcbiAgICAgICAgdXA6IG51bWJlciA9IDAuMTU7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDAuNSAqIDYwO1xyXG4gICAgICAgIHJhbmRvbVg6IG51bWJlciA9IE1hdGgucmFuZG9tKCkgKiAwLjA1IC0gTWF0aC5yYW5kb20oKSAqIDAuMDU7XHJcbiAgICAgICAgYXN5bmMgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtdHJTb2xpZFdoaXRlKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZShfZGFtYWdlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJhbmRvbVgsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBsb2FkVGV4dHVyZShfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1R4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKE1hdGguYWJzKF9kYW1hZ2UpKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0WmVybztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRPbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VG93O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAzOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRocmVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA0OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZvdXI7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDU6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rml2ZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRTZXZlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgODpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRFaWdodDtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgOTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHROaW5lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGFtYWdlID49IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJyZWRcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnVwID0gMC4xO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBoZWFsUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcG9pc29uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgYnVyblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJsZWVkaW5nUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgc2xvd1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUGFydGljbGVzIGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIHtcclxuICAgICAgICBpZDogQnVmZi5CVUZGSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uUGFydGljbGVzOiBHYW1lLsaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVOdW1iZXI6IG51bWJlcjtcclxuICAgICAgICBwYXJ0aWNsZWZyYW1lUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIHdpZHRoOiBudW1iZXI7XHJcbiAgICAgICAgaGVpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCdWZmLkJVRkZJRCwgX3RleHR1cmU6IEdhbWUuxpIuVGV4dHVyZUltYWdlLCBfZnJhbWVDb3VudDogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoZ2V0TmFtZUJ5SWQoX2lkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVmcmFtZU51bWJlciA9IF9mcmFtZUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVSYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25QYXJ0aWNsZXMgPSBuZXcgR2FtZS7GkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbihnZXROYW1lQnlJZCh0aGlzLmlkKSwgbmV3IMaSLkNvYXRUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgX3RleHR1cmUpKVxyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IF90ZXh0dXJlLmltYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgdGhpcy53aWR0aCA9IF90ZXh0dXJlLmltYWdlLndpZHRoIC8gdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25QYXJ0aWNsZXMuZ2VuZXJhdGVCeUdyaWQoxpIuUmVjdGFuZ2xlLkdFVCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCksIHRoaXMucGFydGljbGVmcmFtZU51bWJlciwgMzIsIMaSLk9SSUdJTjJELkNFTlRFUiwgxpIuVmVjdG9yMi5YKHRoaXMud2lkdGgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24odGhpcy5hbmltYXRpb25QYXJ0aWNsZXMpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlWigwLjAwMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuICAgIGZ1bmN0aW9uIGdldE5hbWVCeUlkKF9pZDogQnVmZi5CVUZGSUQpOiBzdHJpbmcge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuQkxFRURJTkc6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJibGVlZGluZ1wiO1xyXG4gICAgICAgICAgICBjYXNlIEJ1ZmYuQlVGRklELlBPSVNPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInBvaXNvblwiO1xyXG4gICAgICAgICAgICBjYXNlIEJ1ZmYuQlVGRklELkhFQUw6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJoZWFsXCI7XHJcbiAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuU0xPVzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNsb3dcIjtcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbnRpdHkge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbnRpdHkgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudEFuaW1hdGlvblN0YXRlOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHJpdmF0ZSBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlcztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbjtcclxuICAgICAgICBwdWJsaWMgYnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgcHJvdGVjdGVkIGNhbk1vdmVYOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwcm90ZWN0ZWQgY2FuTW92ZVk6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByb3RlY3RlZCBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIHByb3RlY3RlZCBhbmltYXRpb25Db250YWluZXI6IEFuaW1hdGlvbkdlbmVyYXRpb24uQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBpZGxlU2NhbGU6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudEtub2NrYmFjazogxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogQXR0cmlidXRlcywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoZ2V0TmFtZUJ5SWQoX2lkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IF9hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKF9uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gX25ldElkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuaWRHZW5lcmF0b3IoKVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyID0gYW5pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuc2NhbGUuZmluZChhbmltYXRpb24gPT4gYW5pbWF0aW9uWzBdID09IFwiaWRsZVwiKVsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZUJ1ZmZzKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5idWZmcy5sZW5ndGggPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWZmcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmJ1ZmZzW2ldLmRvQnVmZlN0dWZmKHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29uc29sZS5sb2codGhpcy5idWZmcy5zcGxpY2UoaSwgMSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KHRoaXMuYnVmZnMsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGxldCB3YWxsQ29sbGlkZXJzOiBHYW1lLsaSLlJlY3RhbmdsZVtdID0gW107XHJcbiAgICAgICAgICAgIHdhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB3YWxsQ29sbGlkZXJzLnB1c2goZWxlbS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGxldCBtZXdEaXJlY3Rpb24gPSBfZGlyZWN0aW9uLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoIW1ld0RpcmVjdGlvbi5lcXVhbHMoR2FtZS7Gki5WZWN0b3IzLlpFUk8oKSkpIHtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNvbGxpZGVyKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQ29sbGlkZXIoX2NvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcltdIHwgR2FtZS7Gki5SZWN0YW5nbGVbXSwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfY29sbGlkZXIuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBDb2xsaWRlci5Db2xsaWRlcikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgdGhpcy5jb2xsaWRlci5yYWRpdXMgKyBlbGVtZW50LnJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIxLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmdldEtub2NrYmFjayh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQub3duZXJOZXRJZCA9PSBHYW1lLmF2YXRhcjIubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmtub2NrYmFja1B1c2godGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBHYW1lLsaSLlJlY3RhbmdsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBpbnRlcnNlY3Rpb24uaGVpZ2h0ICogaW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZFBvc2l0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMih0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLngsIHRoaXMuY29sbGlkZXIucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMihfZGlyZWN0aW9uLngsIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFBZnRlck1vdmUgPSBuZXdJbnRlcnNlY3Rpb24uaGVpZ2h0ICogbmV3SW50ZXJzZWN0aW9uLndpZHRoO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3ZhbHVlICE9IG51bGwgJiYgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaGl0VmFsdWUgPSB0aGlzLmdldERhbWFnZVJlZHVjdGlvbihfdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gaGl0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZVVJKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIE1hdGgucm91bmQoaGl0VmFsdWUpKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVFbmVteSh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGllKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRpZSgpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0RGFtYWdlUmVkdWN0aW9uKF92YWx1ZTogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIF92YWx1ZSAqICgxIC0gKHRoaXMuYXR0cmlidXRlcy5hcm1vciAvIDEwMCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNyZWdpb24ga25vY2tiYWNrXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLnBlcmZvcm1Lbm9ja2JhY2spIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX3Bvc2l0aW9uLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoMCk7XHJcbiAgICAgICAgICAgICAgICBsZXQga25vY2tCYWNrU2NhbGluZzogbnVtYmVyID0gR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc2NhbGU7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShfa25vY2tiYWNrRm9yY2UgKiAoMSAvIGtub2NrQmFja1NjYWxpbmcpKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRLbm9ja2JhY2suYWRkKGRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyByZWR1Y2VLbm9ja2JhY2soKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5zY2FsZSgwLjUpO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyh0aGlzLmN1cnJlbnRLbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUgPCAwLjAwMDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjayA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBlcmZvcm1Lbm9ja2JhY2sgPSBmYWxzZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAgICAgc3dpdGNoQW5pbWF0aW9uKF9uYW1lOiBBTklNQVRJT05TVEFURVMpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBpZiBhbmltYXRpb24gZG9lc250IGV4aXN0IGRvbnQgc3dpdGNoXHJcbiAgICAgICAgICAgIGxldCBuYW1lOiBzdHJpbmcgPSBBTklNQVRJT05TVEFURVNbX25hbWVdLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciAhPSBudWxsICYmIDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSAhPSBfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoX25hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuV0FMSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLldBTEs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuU1VNTU9OO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLkFUVEFDSztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5mcmFtZVJhdGUuZmluZChvYmogPT4gb2JqWzBdID09IG5hbWUpWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBbmltYXRpb25TdGF0ZSh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLndhcm4oXCJubyBhbmltYXRpb25Db250YWluZXIgb3IgYW5pbWF0aW9uIHdpdGggbmFtZTogXCIgKyBuYW1lICsgXCIgYXQgRW50aXR5OiBcIiArIHRoaXMubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBlbnVtIEFOSU1BVElPTlNUQVRFUyB7XHJcbiAgICAgICAgSURMRSwgV0FMSywgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBCRUhBVklPVVIge1xyXG4gICAgICAgIElETEUsIEZPTExPVywgRkxFRSwgU1VNTU9OLCBBVFRBQ0tcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBJRCB7XHJcbiAgICAgICAgUkFOR0VEID0gXCJyYW5nZWRcIixcclxuICAgICAgICBNRUxFRSA9IFwibWVsZWVcIixcclxuICAgICAgICBCQVQgPSBcImJhdFwiLFxyXG4gICAgICAgIFJFRFRJQ0sgPSBcInJlZHRpY2tcIixcclxuICAgICAgICBTTUFMTFRJQ0sgPSBcInNtYWxsdGlja1wiLFxyXG4gICAgICAgIFNLRUxFVE9OID0gXCJza2VsZXRvblwiLFxyXG4gICAgICAgIE9HRVIgPSBcIm9nZXJcIixcclxuICAgICAgICBTVU1NT05PUiA9IFwic3VtbW9ub3JcIlxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROYW1lQnlJZChfaWQ6IEVudGl0eS5JRCk6IHN0cmluZyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBJRC5SQU5HRUQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJyYW5nZWRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5NRUxFRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInRhbmtcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJiYXRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNtYWxsVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic2tlbGV0b25cIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2dlclwiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic3VtbW9ub3JcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEVORU1ZQ0xBU1Mge1xyXG4gICAgICAgIEVORU1ZRFVNQixcclxuICAgICAgICBFTkVNWURBU0gsXHJcbiAgICAgICAgRU5FTVlTTUFTSCxcclxuICAgICAgICBFTkVNWVBBVFJPTCxcclxuICAgICAgICBFTkVNWVNIT09ULFxyXG4gICAgICAgIFNVTU1PTk9SLFxyXG4gICAgICAgIFNVTU1PTk9SQUREU1xyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSO1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMjtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyO1xyXG4gICAgICAgIG1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBfYXR0cmlidXRlcztcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLkVORU1ZO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgKHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5pZGxlU2NhbGUpIC8gMiwgdGhpcy5uZXRJZClcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlQmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICAvLyAoPFBsYXllci5QbGF5ZXI+X2JvZHkpLmdldEtub2NrYmFjayh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2UsIF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKF9kaXJlY3Rpb24pXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBtb3ZlU2ltcGxlKF90YXJnZXQ6IMaSLlZlY3RvcjIpOiDGki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBfdGFyZ2V0O1xyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gZGlyZWN0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUF3YXkoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgbW92ZVNpbXBsZSA9IHRoaXMubW92ZVNpbXBsZShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgbW92ZVNpbXBsZS54ICo9IC0xO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnkgKj0gLTE7XHJcbiAgICAgICAgICAgIHJldHVybiBtb3ZlU2ltcGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGllKCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29sbGlkZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGxldCBrbm9ja2JhY2sgPSB0aGlzLmN1cnJlbnRLbm9ja2JhY2suY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChrbm9ja2JhY2subWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJkaXJlY3Rpb246IFwiICsgX2RpcmVjdGlvbi5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLmFkZChrbm9ja2JhY2spO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICAgICAga25vY2tiYWNrLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBzdXBlci5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBhdmF0YXI6IFBsYXllci5QbGF5ZXJbXSA9ICg8UGxheWVyLlBsYXllcltdPkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKSk7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXZhdGFyQ29sbGlkZXJzOiBDb2xsaWRlci5Db2xsaWRlcltdID0gW107XHJcbiAgICAgICAgICAgICAgICBhdmF0YXIuZm9yRWFjaCgoZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2YXRhckNvbGxpZGVycy5wdXNoKCg8UGxheWVyLlBsYXllcj5lbGVtKS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNvbGxpZGVyKGF2YXRhckNvbGxpZGVycywgX2RpcmVjdGlvbilcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnN1YnRyYWN0KGtub2NrYmFjayk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa25vY2tiYWNrLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImtub2NrYmFjazogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBfZGlyZWN0aW9uLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVkdWNlS25vY2tiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGFyZ2V0LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICAvL1RPRE86IHNldCB0byAzIGFmdGVyIHRlc3RpbmdcclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gMikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1dcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgLy8gZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIC8vICAgICAvLyB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgLy8gYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNtYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIGlzQXR0YWNraW5nID0gZmFsc2U7XHJcbiAgICAgICAgY29vbERvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big1MCAqIDYwKTtcclxuICAgICAgICBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW10gPSBbXTtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG4gICAgICAgIGN1cnJlbnRCZWhhdmlvdXI6IEVudGl0eS5CRUhBVklPVVIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gKDxQbGF5ZXIuUGxheWVyPnRoaXMuYXZhdGFyc1t0aGlzLnJhbmRvbVBsYXllcl0pLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyID09IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLICYmIHRoaXMuZ2V0Q3VycmVudEZyYW1lID49ICg8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tcImF0dGFja1wiXSkuZnJhbWVzLmxlbmd0aCAtIDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXN0YW5jZSA8IDIgJiYgIXRoaXMuaXNBdHRhY2tpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuQVRUQUNLO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0F0dGFja2luZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5jdXJyZW50QmVoYXZpb3VyID09IEVudGl0eS5CRUhBVklPVVIuSURMRSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1dcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBdHRhY2tpbmcgPSBmYWxzZTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuQVRUQUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuQVRUQUNLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RGFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwcm90ZWN0ZWQgZGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgMzAwLCAxLCAyNTAgKiA2MCwgNSk7XHJcbiAgICAgICAgbGFzdE1vdmVEaXJlY2l0b246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgICAgICBkYXNoQ291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXJzW3RoaXMucmFuZG9tUGxheWVyXSkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXN0YW5jZSA8IDMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGFzaC5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0TW92ZURpcmVjaXRvbiA9IHRoaXMubW92ZURpcmVjdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlU2ltcGxlKHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlQYXRyb2wgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcGF0cm9sUG9pbnRzOiDGki5WZWN0b3IyW10gPSBbbmV3IMaSLlZlY3RvcjIoMCwgNCksIG5ldyDGki5WZWN0b3IyKDUsIDApXTtcclxuICAgICAgICB3YWl0VGltZTogbnVtYmVyID0gMTAwMDtcclxuICAgICAgICBjdXJyZW5Qb2ludEluZGV4OiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMucGF0cm9sKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwYXRyb2woKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKMaSLlZlY3RvcjMuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0udG9WZWN0b3IzKCksIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24pKSA+IDAuMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlU2ltcGxlKCjGki5WZWN0b3IyLlNVTSh0aGlzLnBhdHJvbFBvaW50c1t0aGlzLmN1cnJlblBvaW50SW5kZXhdLCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKSkpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVuUG9pbnRJbmRleCArIDEgPCB0aGlzLnBhdHJvbFBvaW50cy5sZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW5Qb2ludEluZGV4Kys7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXggPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0sIHRoaXMud2FpdFRpbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTaG9vdCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICB2aWV3UmFkaXVzOiBudW1iZXIgPSAzO1xyXG4gICAgICAgIGdvdFJlY29nbml6ZWQ6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53ZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oNjAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMiwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uSE9NSU5HKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ290UmVjb2duaXplZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zaG9vdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5nb3RSZWNvZ25pemVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IF9kaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKDApLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA8IDMgfHwgdGhpcy5nb3RSZWNvZ25pemVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgX2RpcmVjdGlvbi5tYWduaXR1ZGUgPCB0aGlzLnZpZXdSYWRpdXMpIHtcclxuICAgICAgICAgICAgLy8gICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIC8vICAgICAvLyBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldChuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSwgX2RpcmVjdGlvbiwgQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiksIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIC8vICAgICBidWxsZXQub3duZXIgPSB0aGlzLnRhZztcclxuICAgICAgICAgICAgLy8gICAgIGJ1bGxldC5mbHlEaXJlY3Rpb24uc2NhbGUoMSAvIEdhbWUuZnJhbWVSYXRlICogYnVsbGV0LnNwZWVkKTtcclxuICAgICAgICAgICAgLy8gICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgLy8gICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0QXRFbmVteShidWxsZXQubmV0SWQsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIHRoaXMud2VhcG9uLmN1cnJlbnRBdHRhY2tDb3VudC0tO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG5cclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3JBZGRzIGV4dGVuZHMgRW5lbXlEYXNoIHtcclxuICAgICAgICBhdmF0YXI6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0OiBQbGF5ZXIuUGxheWVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhciA9IF90YXJnZXQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSB0aGlzLmF2YXRhci5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA+IDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG5cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIGlmIChkaXN0YW5jZSA8IDMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGFzaC5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBkZXNwYXduKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJbnB1dFBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICB0aWNrOiBudW1iZXI7XHJcbiAgICAgICAgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgICAgICBkb2VzQWJpbGl0eTogYm9vbGVhbjtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgZW51bSBJVEVNSUQge1xyXG4gICAgICAgIElDRUJVQ0tFVENIQUxMRU5HRSxcclxuICAgICAgICBETUdVUCxcclxuICAgICAgICBTUEVFRFVQLFxyXG4gICAgICAgIFBST0pFQ1RJTEVTVVAsXHJcbiAgICAgICAgSEVBTFRIVVAsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV04sXHJcbiAgICAgICAgQVJNT1JVUCxcclxuICAgICAgICBIT01FQ09NSU5HLFxyXG4gICAgICAgIFRPWElDUkVMQVRJT05TSElQLFxyXG4gICAgICAgIFZBTVBZLFxyXG4gICAgICAgIFNMT1dZU0xPV1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dEljZUJ1Y2tldDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHREbWdVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRIZWFsdGhVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3hpY1JlbGF0aW9uc2hpcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuSVRFTTtcclxuICAgICAgICBpZDogSVRFTUlEO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyID0gTmV0d29ya2luZy5pZEdlbmVyYXRvcigpO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHRyYW5zZm9ybTogxpIuQ29tcG9uZW50VHJhbnNmb3JtID0gbmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHBvc2l0aW9uOiDGki5WZWN0b3IyXHJcbiAgICAgICAgYnVmZjogQnVmZi5CdWZmW10gPSBbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiaXRlbVwiKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIGlmIChfbmV0SWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5jdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQoKSkpO1xyXG4gICAgICAgICAgICBsZXQgbWF0ZXJpYWw6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwid2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG1hdGVyaWFsKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmYucHVzaCh0aGlzLmdldEJ1ZmZCeUlkKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldFRleHR1cmVCeUlkKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRCdWZmQnlJZCgpOiBCdWZmLkJ1ZmYge1xyXG4gICAgICAgICAgICBsZXQgdGVtcDogSXRlbXMuQnVmZkl0ZW0gPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBCdWZmLkRhbWFnZUJ1ZmYoQnVmZi5CVUZGSUQuUE9JU09OLCB0ZW1wLmR1cmF0aW9uLCB0ZW1wLnRpY2tSYXRlLCB0ZW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlZBTVBZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZi5EYW1hZ2VCdWZmKEJ1ZmYuQlVGRklELkJMRUVESU5HLCB0ZW1wLmR1cmF0aW9uLCB0ZW1wLnRpY2tSYXRlLCB0ZW1wLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNMT1dZU0xPVzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmYuQXR0cmlidXRlc0J1ZmYoQnVmZi5CVUZGSUQuU0xPVywgdGVtcC5kdXJhdGlvbiwgdGVtcC50aWNrUmF0ZSwgdGVtcC52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBsb2FkVGV4dHVyZShfdGV4dHVyZTogxpIuVGV4dHVyZUltYWdlKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbmV3VHh0ID0gX3RleHR1cmU7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBzZXRUZXh0dXJlQnlJZCgpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5JQ0VCVUNLRVRDSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRJY2VCdWNrZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuRE1HVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRJY2VCdWNrZXQpOyAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU1BFRURVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuUFJPSkVDVElMRVNVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRIZWFsdGhVcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhPTUVDT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dFRveGljUmVsYXRpb25zaGlwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlZBTVBZOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0SWNlQnVja2V0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVJdGVtKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgY29uc3QgaXRlbSA9IGdldEludGVybmFsSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIGlmIChpdGVtICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uYW1lID0gaXRlbS5uYW1lO1xyXG4gICAgICAgICAgICAgICAgdGhpcy52YWx1ZSA9IGl0ZW0udmFsdWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlc2NyaXB0aW9uID0gaXRlbS5kZXNjcmlwdGlvbjtcclxuICAgICAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gaXRlbS5pbWdTcmM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkl0ZW0odGhpcywgdGhpcy5pZCwgX3Bvc2l0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRvWW91clRoaW5nKF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSUNFQlVDS0VUQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TUEVFRFVQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgKz0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbiwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cywgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRVVQOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBzZXQgbmV3IGNvbGxpZGVyIGFuZCBzeW5jIG92ZXIgbmV0d29ya1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBzZXQgbmV3IGNvbGxpZGVyIGFuZCBzeW5jIG92ZXIgbmV0d29ya1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuQVJNT1JVUDpcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuYXJtb3IgKz0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F2YXRhci5hdHRyaWJ1dGVzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhPTUVDT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIgaW5zdGFuY2VvZiBQbGF5ZXIuUmFuZ2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5IT01JTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiB0YWxrIHdpdGggdG9iaVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWZmSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlcjtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wID0gZ2V0QnVmZkl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSB0ZW1wLm5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0ZW1wLnZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tSYXRlID0gdGVtcC50aWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IHRlbXAuZHVyYXRpb247XHJcbiAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gdGVtcC5pbWdTcmM7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25JdGVtKHRoaXMsIHRoaXMuaWQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9Zb3VyVGhpbmcoX2F2YXRhcjogUGxheWVyLlBsYXllcik6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZCeUlkKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldEJ1ZmZCeUlkKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbmV3QnVmZiA9IHRoaXMuYnVmZi5maW5kKGJ1ZmYgPT4gYnVmZi5pZCA9PSBCdWZmLkJVRkZJRC5QT0lTT04pLmNsb25lKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5kdXJhdGlvbiA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgICAgICAgICAoPEJ1ZmYuRGFtYWdlQnVmZj5uZXdCdWZmKS52YWx1ZSA9IDAuNTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmJ1ZmZzLnB1c2gobmV3QnVmZik7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuSW50ZXJuYWxJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEJ1ZmZJdGVtQnlJZChfaWQ6IElURU1JRCk6IEl0ZW1zLkJ1ZmZJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5idWZmSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBBbmltYXRpb25HZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBsZXQgdHh0UmVkVGlja0lkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0UmVkVGlja1dhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFNtYWxsVGlja0lkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U21hbGxUaWNrV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0QmF0SWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U2tlbGV0b25JZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNrZWxldG9uV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlcklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlcldhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0T2dlckF0dGFjazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uczogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb25zID0ge307XHJcbiAgICAgICAgc2NhbGU6IFtzdHJpbmcsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIGZyYW1lUmF0ZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5nZXRBbmltYXRpb25CeUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFkZEFuaW1hdGlvbihfYW5pOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbiwgX3NjYWxlOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnNbX2FuaS5uYW1lXSA9IF9hbmk7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUucHVzaChbX2FuaS5uYW1lLCBfc2NhbGVdKTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUucHVzaChbX2FuaS5uYW1lLCBfZnJhbWVSYXRlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRBbmltYXRpb25CeUlkKCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihiYXRJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgYmF0SWRsZS5hbmltYXRpb25TY2FsZSwgYmF0SWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihyZWRUaWNrSWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHJlZFRpY2tJZGxlLmFuaW1hdGlvblNjYWxlLCByZWRUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja1dhbGsuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc21hbGxUaWNrSWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNtYWxsVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHNtYWxsVGlja0lkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc2tlbGV0b25JZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc2tlbGV0b25JZGxlLmFuaW1hdGlvblNjYWxlLCBza2VsZXRvbklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbldhbGsuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuT0dFUjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VySWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIG9nZXJJZGxlLmFuaW1hdGlvblNjYWxlLCBvZ2VySWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcldhbGsuYW5pbWF0aW9uU2NhbGUsIG9nZXJXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlckF0dGFjay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIG9nZXJBdHRhY2suYW5pbWF0aW9uU2NhbGUsIG9nZXJBdHRhY2suZnJhbWVSYXRlKTtcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uTmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldDogxpIuVGV4dHVyZUltYWdlO1xyXG4gICAgICAgIGFtb3VudE9mRnJhbWVzOiBudW1iZXI7XHJcbiAgICAgICAgZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbjtcclxuICAgICAgICBhbmltYXRpb25TY2FsZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2FuaW1hdGlvbk5hbWU6IHN0cmluZywgX3R4dElkbGU6IMaSLlRleHR1cmVJbWFnZSwgX2Ftb3VudE9mRnJhbWVzOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlciwpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25OYW1lID0gX2FuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXQgPSBfdHh0SWRsZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUgPSBfZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmFtb3VudE9mRnJhbWVzID0gX2Ftb3VudE9mRnJhbWVzO1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gc3ByaXRlU2hlZXRcclxuICAgIGxldCBiYXRJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCByZWRUaWNrSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCByZWRUaWNrV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc21hbGxUaWNrSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzbWFsbFRpY2tXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBza2VsZXRvbklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc2tlbGV0b25XYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBvZ2VySWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBvZ2VyV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBvZ2VyQXR0YWNrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBBbmltYXRpb25Db250YWluZXJcclxuICAgIGxldCBiYXRBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCByZWRUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc21hbGxUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc2tlbGV0b25BbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBvZ2VyQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25PYmplY3RzKCkge1xyXG5cclxuICAgICAgICBiYXRJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELkJBVCwgXCJpZGxlXCIsIHR4dEJhdElkbGUsIDQsIDEyKTtcclxuXHJcbiAgICAgICAgcmVkVGlja0lkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuUkVEVElDSywgXCJpZGxlXCIsIHR4dFJlZFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgcmVkVGlja1dhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuUkVEVElDSywgXCJ3YWxrXCIsIHR4dFJlZFRpY2tXYWxrLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHNtYWxsVGlja0lkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU01BTExUSUNLLCBcImlkbGVcIiwgdHh0U21hbGxUaWNrSWRsZSwgNiwgMTIpO1xyXG4gICAgICAgIHNtYWxsVGlja1dhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU01BTExUSUNLLCBcIndhbGtcIiwgdHh0U21hbGxUaWNrV2FsaywgNCwgMTIpO1xyXG5cclxuICAgICAgICBza2VsZXRvbklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU0tFTEVUT04sIFwiaWRsZVwiLCB0eHRTa2VsZXRvbklkbGUsIDUsIDEyKTtcclxuICAgICAgICBza2VsZXRvbldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU0tFTEVUT04sIFwid2Fsa1wiLCB0eHRTa2VsZXRvbldhbGssIDcsIDEyKTtcclxuXHJcbiAgICAgICAgb2dlcklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuT0dFUiwgXCJpZGxlXCIsIHR4dE9nZXJJZGxlLCA1LCA2KTtcclxuICAgICAgICBvZ2VyV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcIndhbGtcIiwgdHh0T2dlcldhbGssIDYsIDYpO1xyXG4gICAgICAgIG9nZXJBdHRhY2sgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuT0dFUiwgXCJhdHRhY2tcIiwgdHh0T2dlckF0dGFjaywgMTAsIDEyKTtcclxuXHJcblxyXG4gICAgICAgIGJhdEFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELkJBVCk7XHJcbiAgICAgICAgcmVkVGlja0FuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlJFRFRJQ0spO1xyXG4gICAgICAgIHNtYWxsVGlja0FuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNNQUxMVElDSyk7XHJcbiAgICAgICAgc2tlbGV0b25BbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TS0VMRVRPTik7XHJcbiAgICAgICAgb2dlckFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELk9HRVIpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRBbmltYXRpb25CeUlkKF9pZDogRW50aXR5LklEKTogQW5pbWF0aW9uQ29udGFpbmVyIHtcclxuICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYmF0QW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZFRpY2tBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBzbWFsbFRpY2tBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNrZWxldG9uQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9nZXJBbmltYXRpb247XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRQaXhlbFJhdGlvKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXggPSBNYXRoLm1heChfd2lkdGgsIF9oZWlnaHQpO1xyXG4gICAgICAgIGxldCBtaW4gPSBNYXRoLm1pbihfd2lkdGgsIF9oZWlnaHQpO1xyXG5cclxuICAgICAgICBsZXQgc2NhbGUgPSAxIC8gbWF4ICogbWluO1xyXG4gICAgICAgIHJldHVybiBzY2FsZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChfY2xhc3M6IE15QW5pbWF0aW9uQ2xhc3MpIHtcclxuICAgICAgICBsZXQgY2xyV2hpdGU6IMaSLkNvbG9yID0gxpIuQ29sb3IuQ1NTKFwid2hpdGVcIik7XHJcbiAgICAgICAgbGV0IGNvYXRlZFNwcml0ZVNoZWV0OiDGki5Db2F0VGV4dHVyZWQgPSBuZXcgxpIuQ29hdFRleHR1cmVkKGNscldoaXRlLCBfY2xhc3Muc3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIGxldCB3aWR0aDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLndpZHRoIC8gX2NsYXNzLmFtb3VudE9mRnJhbWVzO1xyXG4gICAgICAgIGxldCBoZWlnaHQ6IG51bWJlciA9IF9jbGFzcy5zcHJpdGVTaGVldC50ZXhJbWFnZVNvdXJjZS5oZWlnaHQ7XHJcbiAgICAgICAgbGV0IGNyZWF0ZWRBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uID0gbmV3IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKF9jbGFzcy5hbmltYXRpb25OYW1lLCBjb2F0ZWRTcHJpdGVTaGVldCk7XHJcbiAgICAgICAgY3JlYXRlZEFuaW1hdGlvbi5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHdpZHRoLCBoZWlnaHQpLCBfY2xhc3MuYW1vdW50T2ZGcmFtZXMsIDMyLCDGki5PUklHSU4yRC5DRU5URVIsIMaSLlZlY3RvcjIuWCh3aWR0aCkpO1xyXG4gICAgICAgIF9jbGFzcy5hbmltYXRpb25TY2FsZSA9IGdldFBpeGVsUmF0aW8od2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgX2NsYXNzLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiA9IGNyZWF0ZWRBbmltYXRpb247XHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcm90ZWN0ZWQgdGltZXI6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRUaWNrOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHB1YmxpYyBtaW5UaW1lQmV0d2VlblRpY2tzOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGdhbWVUaWNrUmF0ZTogbnVtYmVyID0gNjIuNTtcclxuICAgICAgICBwcm90ZWN0ZWQgYnVmZmVyU2l6ZTogbnVtYmVyID0gMTAyNDtcclxuICAgICAgICBwcm90ZWN0ZWQgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRlQnVmZmVyOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluVGltZUJldHdlZW5UaWNrcyA9IDEgLyB0aGlzLmdhbWVUaWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZD4odGhpcy5idWZmZXJTaXplKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX293bmVyTmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSW5wdXRQYXlsb2FkKTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQge1xyXG4gICAgICAgICAgICAvL1RPRE86IGltcGxlbWVudCB3aG9sZSBtb3ZlbWVudCBjYWxjdWxhdGlvbiBpbmNsdXNpdmUgY29sbGlzaW9uXHJcbiAgICAgICAgICAgIC8vZG8gbW92ZW1lbnQgXHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChjbG9uZUlucHV0VmVjdG9yLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNsb25lSW5wdXRWZWN0b3Iubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgaW5wdXQuZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPnRoaXMub3duZXIpLm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQgPSB7IHRpY2s6IGlucHV0LnRpY2ssIHBvc2l0aW9uOiB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLCBkb2VzQWJpbGl0eTogaW5wdXQuZG9lc0FiaWxpdHkgfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3U3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQ2xpZW50UHJlZGljdGlvbiBleHRlbmRzIFByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcml2YXRlIGlucHV0QnVmZmVyOiBJbnRlcmZhY2VzLklucHV0UGF5bG9hZFtdO1xyXG4gICAgICAgIHByaXZhdGUgbGF0ZXN0U2VydmVyU3RhdGU6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgbGFzdFByb2Nlc3NlZFN0YXRlOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGhvcml6b250YWxJbnB1dDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgdmVydGljYWxJbnB1dDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBkb2VzQWJpbGl0eTogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4xO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JbnB1dFBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob3Jpem9udGFsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueDtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbElucHV0ID0gSW5wdXRTeXN0ZW0ubW92ZSgpLnk7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSAhPSB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCk7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSW5wdXRQYXlsb2FkID0geyB0aWNrOiB0aGlzLmN1cnJlbnRUaWNrLCBpbnB1dFZlY3RvcjogbmV3IMaSLlZlY3RvcjModGhpcy5ob3Jpem9udGFsSW5wdXQsIHRoaXMudmVydGljYWxJbnB1dCwgMCksIGRvZXNBYmlsaXR5OiB0aGlzLmRvZXNBYmlsaXR5IH07XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXJbYnVmZmVySW5kZXhdID0gaW5wdXRQYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbnB1dFBheWxvYWQudGljayArIFwiX19fXCIgKyBpbnB1dFBheWxvYWQuaW5wdXRWZWN0b3IuY2xvbmUpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZCk7XHJcblxyXG4gICAgICAgICAgICAvL3NlbmQgaW5wdXRQYXlsb2FkIHRvIGhvc3RcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kQ2xpZW50SW5wdXQodGhpcy5vd25lck5ldElkLCBpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vd25lci5pZCA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuUmFuZ2VkPnRoaXMub3duZXIpLmRhc2guZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuTWVsZWU+dGhpcy5vd25lcikuYmxvY2suZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSA9IF9zZXJ2ZXJTdGF0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4ID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb25FcnJvcjogbnVtYmVyID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbiwgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XS5wb3NpdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb25FcnJvciA+IHRoaXMuQXN5bmNUb2xlcmFuY2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2FybihcInlvdSBuZWVkIHRvIGJlIHVwZGF0ZWQgdG86IFg6XCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnggKyBcIiBZOiBcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdGlja1RvUHJvY2VzcyA9ICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgKyAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodGlja1RvUHJvY2VzcyA8IHRoaXMuY3VycmVudFRpY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLlN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNlcnZlclByZWRpY3Rpb24gZXh0ZW5kcyBQcmVkaWN0aW9uIHtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dFF1ZXVlOiBRdWV1ZSA9IG5ldyBRdWV1ZSgpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0UGF5bG9hZCA9IHRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKVxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChidWZmZXJJbmRleCAhPSAtMSkge1xyXG4gICAgICAgICAgICAgICAgLy9TZW5kIHRvIGNsaWVudCBuZXcgcG9zaXRpb25cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZFNlcnZlckJ1ZmZlcih0aGlzLm93bmVyTmV0SWQsIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQ2xpZW50SW5wdXQoaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0UGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UXVldWUuZW5xdWV1ZShpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIGNsYXNzIFF1ZXVlIHtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBJbnRlcmZhY2VzLklucHV0UGF5bG9hZFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcigpIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcyA9IFtdO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZW5xdWV1ZShfaXRlbTogSW50ZXJmYWNlcy5JbnB1dFBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcy5wdXNoKF9pdGVtKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlcXVldWUoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLnNoaWZ0KCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRRdWV1ZUxlbmd0aCgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SXRlbXMoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgQWJpbGl0eSB7XHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgQWJpbGl0eSB7XHJcbiAgICAgICAgcHJvdGVjdGVkIG93bmVyTmV0SWQ6IG51bWJlcjsgZ2V0IG93bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyTmV0SWQpIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xkb3duOiBDb29sZG93bjtcclxuICAgICAgICBwcm90ZWN0ZWQgYWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRhYmlsaXR5Q291bnQ6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZHVyYXRpb246IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgZG9lc0FiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX2R1cmF0aW9uOiBudW1iZXIsIF9hYmlsaXR5Q291bnQ6IG51bWJlciwgX2Nvb2xkb3duVGltZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gX2R1cmF0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmFiaWxpdHlDb3VudCA9IF9hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb29sZG93biA9IG5ldyBDb29sZG93bihfY29vbGRvd25UaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vZG8gc3R1ZmZcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFjdGl2YXRlQWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy5kdXJhdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJsb2NrIGV4dGVuZHMgQWJpbGl0eSB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhc2ggZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlciwgX3NwZWVkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQsIF9kdXJhdGlvbiwgX2FiaWxpdHlDb3VudCwgX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5zcGVlZCAqPSA1O1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLnNwZWVkIC89IDU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTcGF3blN1bW1vbmVycyBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5TTUFMTFRJQ0ssIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIG51bGwsIEdhbWUuYXZhdGFyMSwgbnVsbCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvb2xkb3duIHtcclxuICAgICAgICBwdWJsaWMgaGFzQ29vbERvd246IGJvb2xlYW5cclxuICAgICAgICBwcml2YXRlIGNvb2xEb3duOiBudW1iZXJcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRDb29sZG93bjogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9udW1iZXI6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSBfbnVtYmVyO1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHN0YXJ0Q29vbERvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFzQ29vbERvd24gPSB0cnVlXHJcbiAgICAgICAgICAgIEdhbWUuY29vbERvd25zLnB1c2godGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGVuZENvb2xET3duKCkge1xyXG4gICAgICAgICAgICBHYW1lLmNvb2xEb3ducyA9IEdhbWUuY29vbERvd25zLmZpbHRlcihjZCA9PiBjZCAhPSB0aGlzKTtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZUNvb2xEb3duKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSB0aGlzLmNvb2xEb3duO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lbmRDb29sRE93bigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgaGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgbWF4SGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgICAgICBoaXRhYmxlOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBhcm1vcjogbnVtYmVyO1xyXG4gICAgICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgYXR0YWNrUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgY29vbERvd25SZWR1Y3Rpb246IG51bWJlciA9IDE7XHJcbiAgICAgICAgc2NhbGU6IG51bWJlcjtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9oZWFsdGhQb2ludHM6IG51bWJlciwgX2F0dGFja1BvaW50czogbnVtYmVyLCBfc3BlZWQ6IG51bWJlciwgX3NjYWxlOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfYXJtb3I6IG51bWJlciwgX2Nvb2xkb3duUmVkdWN0aW9uPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUgPSBfc2NhbGU7XHJcbiAgICAgICAgICAgIHRoaXMuYXJtb3IgPSBfYXJtb3I7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gX2hlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSB0aGlzLmhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBfYXR0YWNrUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gX2tub2NrYmFja0ZvcmNlXHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSB0aGlzLmtub2NrYmFja0ZvcmNlICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMDtcclxuICAgICAgICAgICAgaWYgKF9jb29sZG93blJlZHVjdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd25SZWR1Y3Rpb24gPSBfY29vbGRvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy51cGRhdGVTY2FsZURlcGVuZGVuY2llcygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLm1heEhlYWx0aFBvaW50cyAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDApO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5oZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRhY2tQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuYXR0YWNrUG9pbnRzICogdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBNYXRoLmZyb3VuZCh0aGlzLnNwZWVkIC8gdGhpcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSB0aGlzLmtub2NrYmFja0ZvcmNlICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG4gICAgZXhwb3J0IGNsYXNzIFN1bW1vbm9yIGV4dGVuZHMgRW5lbXlTaG9vdCB7XHJcbiAgICAgICAgZGFtYWdlVGFrZW46IG51bWJlciA9IDA7XHJcbiAgICAgICAgYmVnaW5EZWZlbmNlUGhhc2U6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBkZWZlbmNlUGhhc2VUaW1lOiBudW1iZXIgPSA3MjA7XHJcbiAgICAgICAgZGVmZW5jZVBoYXNlQ3VycmVudFRpbWU6IG51bWJlciA9IDA7XHJcbiAgICAgICAgc3VtbW9uQ2hhbmNlOiBudW1iZXIgPSA1O1xyXG4gICAgICAgIHN1bW1vbkNvb2xkb3duOiBudW1iZXIgPSAxMjA7XHJcbiAgICAgICAgc3VtbW9uQ3VycmVudENvb2xkb3duOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHByaXZhdGUgc3VtbW9uOiBBYmlsaXR5LlNwYXduU3VtbW9uZXJzID0gbmV3IEFiaWxpdHkuU3Bhd25TdW1tb25lcnModGhpcy5uZXRJZCwgMCwgNSwgNSAqIDYwKVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2F0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5FTkVNWTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvb2xkb3duKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5zdW1tb25DdXJyZW50Q29vbGRvd24gPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN1bW1vbkN1cnJlbnRDb29sZG93bi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24oKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nb3RSZWNvZ25pemVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFtYWdlVGFrZW4gPj0gMjUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5kYW1hZ2VUYWtlbiArPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNraW5nUGhhc2UoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuU1VNTU9OKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF0dGFja2luZ1BoYXNlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hvb3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlZmVuY2VQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBtYWtlIGlmIGRlcGVuZGVudCBmcm9tIHRlbGVwb3J0IGFuaW1hdGlvbiBmcmFtZVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZXF1YWxzKG5ldyDGki5WZWN0b3IyKDAsIC0xMykudG9WZWN0b3IzKCksIDEpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUobmV3IMaSLlZlY3RvcjIoMCwgLTEzKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuYmVnaW5EZWZlbmNlUGhhc2UpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZUN1cnJlbnRUaW1lID0gTWF0aC5yb3VuZCh0aGlzLmRlZmVuY2VQaGFzZVRpbWUgKyBNYXRoLnJhbmRvbSgpICogMTIwKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luRGVmZW5jZVBoYXNlID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmRlZmVuY2VQaGFzZUN1cnJlbnRUaW1lID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyhuZXcgxpIuVmVjdG9yMigwLCAtMTMpLnRvVmVjdG9yMygpLCAxKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjIoMCwgLTEzKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuc3VtbW9uQ3VycmVudENvb2xkb3duIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gaWYgKHRoaXMuc3VtbW9uLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXh0U3RhdGUgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5leHRTdGF0ZSA8PSB0aGlzLnN1bW1vbkNoYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gdGhpcy5zdW1tb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3VtbW9uLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdW1tb25DdXJyZW50Q29vbGRvd24gPSB0aGlzLnN1bW1vbkNvb2xkb3duO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2VDdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRhbWFnZVRha2VuID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmJlZ2luRGVmZW5jZVBoYXNlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHN1bW1vbigpIHtcclxuICAgICAgICAvLyAgICAgbGV0IHRhcmdldCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcbiAgICAgICAgLy8gICAgIGlmICh0YXJnZXQgPiAwKSB7XHJcbiAgICAgICAgLy8gICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuU01BTExUSUNLLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBudWxsLCBHYW1lLmF2YXRhcjEpO1xyXG4gICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELlNNQUxMVElDSywgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgbnVsbCwgR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgIC8vIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWZmIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBCVUZGSUQge1xyXG4gICAgICAgIEJMRUVESU5HLFxyXG4gICAgICAgIFBPSVNPTixcclxuICAgICAgICBIRUFMLFxyXG4gICAgICAgIFNMT1dcclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWZmIHtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXJcclxuICAgICAgICBpZDogQlVGRklEO1xyXG4gICAgICAgIHByb3RlY3RlZCBub0R1cmF0aW9uOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IF9kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50aWNrUmF0ZSA9IF90aWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5ub0R1cmF0aW9uID0gMDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldFBhcnRpY2xlQnlJZChfaWQ6IEJVRkZJRCk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELlBPSVNPTiwgVUkucG9pc29uUGFydGljbGUsIDYsIDEyKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNsb25lKCk6IEJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFwcGx5QnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRUb0VudGl0eShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmJ1ZmZzLmZpbHRlcihidWZmID0+IGJ1ZmYuaWQgPT0gdGhpcy5pZCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG5cclxuICAgICAgICAgICAgICAgIF9hdmF0YXIuYnVmZnMucHVzaCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjbG9uZSgpOiBEYW1hZ2VCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYW1hZ2VCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZG9CdWZmU3R1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnJlbW92ZUNoaWxkKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5kdXJhdGlvbiAlIHRoaXMudGlja1JhdGUgPT0gMCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ub0R1cmF0aW9uICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFydGljbGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYWRkQ2hpbGQocGFydGljbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24rKztcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZEYW1nZUJ5SWQodGhpcy5pZCwgX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEJ1ZmZEYW1nZUJ5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELkJMRUVESU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgZG8gZGFtYWdlIHRvIHBsYXllciB1bnRpbCBoZSBoYXMgMjAlIGhlYWx0aFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgKiAwLjIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXNCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgaXNCdWZmQXBwbGllZDogYm9vbGVhbjtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIHJlbW92ZWRWYWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2xvbmUoKTogQXR0cmlidXRlc0J1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEF0dHJpYnV0ZXNCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmICghdGhpcy5pc0J1ZmZBcHBsaWVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpZiAoX2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBwYXJ0aWNsZSA9IHRoaXMuZ2V0UGFydGljbGVCeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbisrO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlbW92ZUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZBdHRyaWJ1dGVCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXBwbHlCdWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRCdWZmQXR0cmlidXRlQnlJZCh0aGlzLmlkLCBfYXZhdGFyLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0QnVmZkF0dHJpYnV0ZUJ5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIDUwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkIC09IHRoaXMucmVtb3ZlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdmF0YXIuYXR0cmlidXRlcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVMTEVUVFlQRSB7XHJcbiAgICAgICAgU1RBTkRBUkQsXHJcbiAgICAgICAgSElHSFNQRUVELFxyXG4gICAgICAgIFNMT1csXHJcbiAgICAgICAgTUVMRUVcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUsIEludGVyZmFjZXMuSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkJVTExFVDtcclxuICAgICAgICBvd25lcjogbnVtYmVyOyBnZXQgX293bmVyKCk6IEVudGl0eS5FbnRpdHkgeyByZXR1cm4gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyKSB9O1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG5cclxuICAgICAgICBwdWJsaWMgdGljazogbnVtYmVyID0gMDtcclxuICAgICAgICBwdWJsaWMgcG9zaXRpb25zOiDGki5WZWN0b3IzW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgaG9zdFBvc2l0aW9uczogxpIuVmVjdG9yM1tdID0gW107XHJcblxyXG4gICAgICAgIHB1YmxpYyBmbHlEaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgZGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG5cclxuICAgICAgICBwdWJsaWMgaGl0UG9pbnRzU2NhbGU6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgc3BlZWQ6IG51bWJlciA9IDIwO1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAxICogNjA7XHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlciA9IDQ7XHJcbiAgICAgICAgdHlwZTogQlVMTEVUVFlQRTtcclxuXHJcbiAgICAgICAgdGltZTogbnVtYmVyID0gMDtcclxuICAgICAgICBraWxsY291bnQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIGFzeW5jIGRlc3Bhd24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlQnVsbGV0KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9zcGVlZDogbnVtYmVyLCBfaGl0UG9pbnRzOiBudW1iZXIsIF9saWZldGltZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2tpbGxjb3VudDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9vd25lcklkOiBudW1iZXIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuY3VycmVudElEcy5wdXNoKF9uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5ldElkID0gX25ldElkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuaWRHZW5lcmF0b3IoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IF9oaXRQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSBfbGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSBfa25vY2tiYWNrRm9yY2U7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gX2tpbGxjb3VudDtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXdQb3NpdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55IC8gMS41LCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVSb3RhdGlvbihfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWCgpO1xyXG4gICAgICAgICAgICB0aGlzLmRpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIgPSBfb3duZXJJZDtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBhc3luYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZSh0aGlzLmZseURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5fb3duZXIgPT0gR2FtZS5hdmF0YXIyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWxsZXRQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubXR4TG9jYWwucm90YXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuX293bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZSh0aGlzLmZseURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5idWxsZXRQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRvS25vY2tiYWNrKF9ib2R5OiDGkkFpZC5Ob2RlU3ByaXRlKTogdm9pZCB7XHJcbiAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+X2JvZHkpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMyk6IHZvaWQge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZVJvdGF0aW9uKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKENhbGN1bGF0aW9uLmNhbGNEZWdyZWUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIMaSLlZlY3RvcjMuU1VNKF9kaXJlY3Rpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKSkgKyA5MCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBidWxsZXRQcmVkaWN0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRpbWUgKz0gR2FtZS5kZWx0YVRpbWU7XHJcblxyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lID49IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMucG9zaXRpb25zLnB1c2gobmV3IMaSLlZlY3RvcjModGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueikpO1xyXG4gICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5wcmVkaWN0aW9uQnVsbGV0KHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm5ldElkLCB0aGlzLnRpY2spO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy50aWNrKys7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWUgLT0gMTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMudGljayA+PSAxICYmIHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXSAhPSB1bmRlZmluZWQgJiYgdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2sgLSAxXS54ICE9IHRoaXMucG9zaXRpb25zW3RoaXMudGljayAtIDFdLnggfHwgdGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGljayAtIDFdLnkgIT0gdGhpcy5wb3NpdGlvbnNbdGhpcy50aWNrIC0gMV0ueSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvcnJlY3RQb3NpdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgY29ycmVjdFBvc2l0aW9uKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ob3N0UG9zaXRpb25zW3RoaXMudGlja10gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMuaG9zdFBvc2l0aW9uc1t0aGlzLnRpY2tdO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHRoaXMuY29ycmVjdFBvc2l0aW9uIH0sIDEwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRUZXh0dXJlKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJXSElURVwiKTtcclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVmZihfdGFyZ2V0OiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHRoaXMuX293bmVyLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmJ1ZmYuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZi5jbG9uZSgpLmFkZFRvRW50aXR5KF90YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiDGki5Ob2RlW10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuX293bmVyLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikge1xyXG4gICAgICAgICAgICAgICAgY29sbGlkZXJzID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEVuZW15LkVuZW15ID0gKDxFbmVteS5FbmVteT5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSAmJiBlbGVtZW50LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkICYmIHRoaXMua2lsbGNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICgoPEVuZW15LkVuZW15PmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEVuZW15LlN1bW1vbm9yQWRkcykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuU3VtbW9ub3JBZGRzPmVsZW1lbnQpLmF2YXRhciA9PSB0aGlzLl9vd25lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuZ2V0RGFtYWdlKHRoaXMuX293bmVyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzICogdGhpcy5oaXRQb2ludHNTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVmZigoPEVuZW15LkVuZW15PmVsZW1lbnQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxFbmVteS5FbmVteT5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgaWYgKHRoaXMuX293bmVyLnRhZyA9PSBUYWcuVEFHLkVORU1ZKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogUGxheWVyLlBsYXllciA9ICg8UGxheWVyLlBsYXllcj5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDAgJiYgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50c1NjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEdlbmVyYXRpb24uV2FsbCA9ICg8R2VuZXJhdGlvbi5XYWxsPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTWVsZWVCdWxsZXQgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcsIF9zcGVlZDogbnVtYmVyLCBfaGl0UG9pbnRzOiBudW1iZXIsIF9saWZldGltZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2tpbGxjb3VudDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSwgX3NwZWVkLCBfaGl0UG9pbnRzLCBfbGlmZXRpbWUsIF9rbm9ja2JhY2tGb3JjZSwgX2tpbGxjb3VudCwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gNjtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IDEwO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gNjtcclxuICAgICAgICAgICAgdGhpcy5raWxsY291bnQgPSA0O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYXN5bmMgbG9hZFRleHR1cmUoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfc3BlZWQ6IG51bWJlciwgX2hpdFBvaW50czogbnVtYmVyLCBfbGlmZXRpbWU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9raWxsY291bnQ6IG51bWJlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJJZDogbnVtYmVyLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lLCBfc3BlZWQsIF9oaXRQb2ludHMsIF9saWZldGltZSwgX2tub2NrYmFja0ZvcmNlLCBfa2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9vd25lcklkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIDYwO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMudGFyZ2V0ID0gxpIuVmVjdG9yMy5TVU0odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhcmdldChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFzeW5jIHVwZGF0ZSgpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLl9vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUhvbWluZygpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRUYXJnZXQoX25ldElEOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBfbmV0SUQpLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY2FsY3VsYXRlSG9taW5nKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3RGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgaWYgKG5ld0RpcmVjdGlvbi54ICE9IDAgJiYgbmV3RGlyZWN0aW9uLnkgIT0gMCkge1xyXG4gICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCByb3RhdGVBbW91bnQyOiBudW1iZXIgPSDGki5WZWN0b3IzLkNST1NTKG5ld0RpcmVjdGlvbiwgdGhpcy5tdHhMb2NhbC5nZXRYKCkpLno7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwucm90YXRlWigtcm90YXRlQW1vdW50MiAqIHRoaXMucm90YXRlU3BlZWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBDb2xsaWRlciB7XHJcbiAgICBleHBvcnQgY2xhc3MgQ29sbGlkZXIge1xyXG4gICAgICAgIHB1YmxpYyBvd25lck5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgcmFkaXVzOiBudW1iZXI7XHJcbiAgICAgICAgcG9zaXRpb246IMaSLlZlY3RvcjI7XHJcbiAgICAgICAgZ2V0IHRvcCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGxlZnQoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnggLSB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCByaWdodCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IGJvdHRvbSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueSArIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3JhZGl1czogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLnJhZGl1cyA9IF9yYWRpdXM7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgPiBkaXN0YW5jZS5tYWduaXR1ZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzUmVjdChfY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxlZnQgPiBfY29sbGlkZXIucmlnaHQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmlnaHQgPCBfY29sbGlkZXIubGVmdCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50b3AgPiBfY29sbGlkZXIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJvdHRvbSA8IF9jb2xsaWRlci50b3ApIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb24oX2NvbGxpZGVyOiBDb2xsaWRlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlcyhfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyAtIGRpc3RhbmNlLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb25SZWN0KF9jb2xsaWRlcjogxpIuUmVjdGFuZ2xlKTogxpIuUmVjdGFuZ2xlIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzUmVjdChfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uOiDGki5SZWN0YW5nbGUgPSBuZXcgxpIuUmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi54ID0gTWF0aC5tYXgodGhpcy5sZWZ0LCBfY29sbGlkZXIubGVmdCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi55ID0gTWF0aC5tYXgodGhpcy50b3AsIF9jb2xsaWRlci50b3ApO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ud2lkdGggPSBNYXRoLm1pbih0aGlzLnJpZ2h0LCBfY29sbGlkZXIucmlnaHQpIC0gaW50ZXJzZWN0aW9uLng7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi5oZWlnaHQgPSBNYXRoLm1pbih0aGlzLmJvdHRvbSwgX2NvbGxpZGVyLmJvdHRvbSkgLSBpbnRlcnNlY3Rpb24ueTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15U3Bhd25lciB7XHJcbiAgICBsZXQgc3Bhd25UaW1lOiBudW1iZXIgPSAwICogNjA7XHJcbiAgICBsZXQgY3VycmVudFRpbWU6IG51bWJlciA9IHNwYXduVGltZTtcclxuICAgIGxldCBtYXhFbmVtaWVzOiBudW1iZXIgPSAwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkVuZW1pZXMoKTogdm9pZCB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBsZXQgY3VycmVudFJvb20gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW0pLnRhZyA9PSBUYWcuVEFHLlJPT00pKTtcclxuICAgICAgICAgICAgbWF4RW5lbWllcyA9IGN1cnJlbnRSb29tLmVuZW15Q291bnQ7XHJcbiAgICAgICAgICAgIHdoaWxlIChtYXhFbmVtaWVzID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbWF4RW5lbWllcyA9IGN1cnJlbnRSb29tLmVuZW15Q291bnQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIoKE1hdGgucmFuZG9tKCkgKiA3IC0gKE1hdGgucmFuZG9tKCkgKiA3KSkgKiAyLCAoTWF0aC5yYW5kb20oKSAqIDcgLSAoTWF0aC5yYW5kb20oKSAqIDcpICogMikpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLmFkZChjdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2cocG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdXNlIElEIHRvIGdldCByYW5kb20gZW5lbWllc1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0gsIEVudGl0eS5JRC5PR0VSLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFJvb20uZW5lbXlDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY3VycmVudFRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY3VycmVudFRpbWUgPSBzcGF3blRpbWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0UmFuZG9tRW5lbXlJZCgpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCByYW5kb20gPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiBPYmplY3Qua2V5cyhFbnRpdHkuSUQpLmxlbmd0aCAvIDIpO1xyXG4gICAgICAgIGlmIChyYW5kb20gPD0gMikge1xyXG4gICAgICAgICAgICByZXR1cm4gZ2V0UmFuZG9tRW5lbXlJZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmFuZG9tKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJhbmRvbTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkJ5SUQoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9hdHRyaWJ1dGVzPzogRW50aXR5LkF0dHJpYnV0ZXMsIF90YXJnZXQ/OiBQbGF5ZXIuUGxheWVyLCBfbmV0SUQ/OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15O1xyXG4gICAgICAgIGxldCByZWYgPSBudWxsO1xyXG4gICAgICAgIGlmIChfYXR0cmlidXRlcyA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IF9pZC50b1N0cmluZygpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3dpdGNoIChfZW5lbXlDbGFzcykge1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEQVNIOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZREFTSDpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihfaWQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWVBBVFJPTDpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAvLyBjYXNlIEVuZW15LkU6XHJcbiAgICAgICAgICAgIC8vICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNob290KF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAvLyAgICAgfVxyXG4gICAgICAgICAgICAvLyAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWVNNQVNIOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTbWFzaChfaWQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3JBZGRzKF9pZCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIE1hdGgucmFuZG9tKCkgKiByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSArIDAuNSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yQWRkcyhfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KF9lbmVteUNsYXNzLCBlbmVteSwgZW5lbXkubmV0SWQpO1xyXG4gICAgICAgIC8vIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAvLyAgICAgICAgIGlmIChfYXR0cmlidXRlcyA9PSBudWxsICYmIF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgY29uc3QgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gXCJiYXRcIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVudGl0eS5JRC5CQVQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoRW50aXR5LklELkJBVCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcInJlZHRpY2tcIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKEVudGl0eS5JRC5SRURUSUNLLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSArIChNYXRoLnJhbmRvbSgpICogMC4yIC0gTWF0aC5yYW5kb20oKSAqIDAuMiksIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgICAgICAvLyBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNob290KEVudGl0eS5JRC5SRURUSUNLLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIG5ldyBXZWFwb25zLldlYXBvbig1MCwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCAxKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKEVudGl0eS5JRC5SRURUSUNLLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIC8vIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoRW50aXR5LklELlJFRFRJQ0ssIF9hdHRyaWJ1dGVzLCBuZXcgV2VhcG9ucy5XZWFwb24oNTAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMSksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoX2F0dHJpYnV0ZXMgPT0gbnVsbCAmJiBfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuZW5lbWllc0pTT04uZmluZChlbmVteSA9PiBlbmVteS5uYW1lID09IFwic21hbGx0aWNrXCIpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChFbnRpdHkuSUQuU01BTExUSUNLLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSArIChNYXRoLnJhbmRvbSgpICogMC4yIC0gTWF0aC5yYW5kb20oKSAqIDAuMiksIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChFbnRpdHkuSUQuU01BTExUSUNLLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELlNLRUxFVE9OOlxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcInNrZWxldG9uXCIpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihFbnRpdHkuSUQuU0tFTEVUT04sIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlICsgKE1hdGgucmFuZG9tKCkgKiAwLjIgLSBNYXRoLnJhbmRvbSgpICogMC4yKSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKEVudGl0eS5JRC5TS0VMRVRPTiwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAvLyAgICAgICAgIH1cclxuICAgICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcIm9nZXJcIik7XHJcbiAgICAgICAgLy8gICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTbWFzaChFbnRpdHkuSUQuT0dFUiwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAoTWF0aC5yYW5kb20oKSAqIDAuMiAtIE1hdGgucmFuZG9tKCkgKiAwLjIpLCByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKEVudGl0eS5JRC5PR0VSLCBfYXR0cmlidXRlcywgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgIC8vICAgICAgICAgfVxyXG4gICAgICAgIC8vICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgLy8gICAgIGNhc2UgRW50aXR5LklELlNVTU1PTk9SOlxyXG4gICAgICAgIC8vICAgICAgICAgaWYgKF9hdHRyaWJ1dGVzID09IG51bGwgJiYgX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBcInN1bW1vbm9yXCIpO1xyXG4gICAgICAgIC8vICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yKEVudGl0eS5JRC5TVU1NT05PUiwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUgKyAoTWF0aC5yYW5kb20oKSAqIDAuMiAtIE1hdGgucmFuZG9tKCkgKiAwLjIpLCByZWYuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgcmVmLmF0dHJpYnV0ZXMuYXJtb3IpLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBlbHNlIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihFbnRpdHkuSUQuU1VNTU9OT1IsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgICAgICBicmVhaztcclxuICAgICAgICAvLyAgICAgZGVmYXVsdDpcclxuICAgICAgICAvLyAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIC8vIH1cclxuICAgICAgICBpZiAoZW5lbXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGVuZW15KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG5ldHdvcmtTcGF3bkJ5SWQoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElEOiBudW1iZXIsIF90YXJnZXQ/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoX3RhcmdldCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjEubmV0SWQgPT0gX3RhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgX2F0dHJpYnV0ZXMsIEdhbWUuYXZhdGFyMSwgX25ldElEKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNwYXduQnlJRChfZW5lbXlDbGFzcywgX2lkLCBfcG9zaXRpb24sIF9hdHRyaWJ1dGVzLCBHYW1lLmF2YXRhcjIsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzcGF3bkJ5SUQoX2VuZW15Q2xhc3MsIF9pZCwgX3Bvc2l0aW9uLCBfYXR0cmlidXRlcywgbnVsbCwgX25ldElEKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQoX3ZlY3RvclRvUm90YXRlOiDGki5WZWN0b3IzLCBfYW5nbGU6IG51bWJlcik6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBhbmdsZVRvUmFkaWFuOiBudW1iZXIgPSBfYW5nbGUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdYID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKSAtIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbik7XHJcbiAgICAgICAgbGV0IG5ld1kgPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pICsgX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyDGki5WZWN0b3IzKG5ld1gsIG5ld1ksIF92ZWN0b3JUb1JvdGF0ZS56KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2Jhc2VWYWx1ZTogbnVtYmVyLCBfcGVyY2VudGFnZUFtb3VudDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gX2Jhc2VWYWx1ZSAqICgoMTAwICsgX3BlcmNlbnRhZ2VBbW91bnQpIC8gMTAwKTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKDEwMCAvICgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iLCJuYW1lc3BhY2UgSW5wdXRTeXN0ZW0ge1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWJvYXJkRG93bkV2ZW50KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBrZXlib2FyZFVwRXZlbnQpO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBhdHRhY2spO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCByb3RhdGVUb01vdXNlKTtcclxuXHJcbiAgICAvLyNyZWdpb24gcm90YXRlXHJcbiAgICBsZXQgbW91c2VQb3NpdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVUb01vdXNlKF9tb3VzZUV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCByYXk6IMaSLlJheSA9IEdhbWUudmlld3BvcnQuZ2V0UmF5RnJvbUNsaWVudChuZXcgxpIuVmVjdG9yMihfbW91c2VFdmVudC5vZmZzZXRYLCBfbW91c2VFdmVudC5vZmZzZXRZKSk7XHJcbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb24gPSByYXkuaW50ZXJzZWN0UGxhbmUobmV3IMaSLlZlY3RvcjMoMCwgMCwgMCksIG5ldyDGki5WZWN0b3IzKDAsIDAsIDEpKTtcclxuICAgICAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZShHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIG1vdXNlUG9zaXRpb24pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjUG9zaXRpb25Gcm9tRGVncmVlKF9kZWdyZWVzOiBudW1iZXIsIF9kaXN0YW5jZTogbnVtYmVyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgbGV0IGRpc3RhbmNlID0gNTtcclxuICAgICAgICBsZXQgbmV3RGVnID0gKF9kZWdyZWVzICogTWF0aC5QSSkgLyAxODA7XHJcbiAgICAgICAgbGV0IHkgPSBNYXRoLmNvcyhuZXdEZWcpO1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5zaW4obmV3RGVnKSAqIC0xO1xyXG4gICAgICAgIGxldCBjb29yZCA9IG5ldyDGki5WZWN0b3IyKHgsIHkpO1xyXG4gICAgICAgIGNvb3JkLnNjYWxlKGRpc3RhbmNlKTtcclxuICAgICAgICByZXR1cm4gY29vcmQ7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gbW92ZSBhbmQgYWJpbGl0eVxyXG4gICAgbGV0IGNvbnRyb2xsZXIgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oW1xyXG4gICAgICAgIFtcIldcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkFcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIlNcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkRcIiwgZmFsc2VdXHJcbiAgICBdKTtcclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZERvd25FdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpICE9IFwiU1BBQ0VcIikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvL0RvIGFiaWx0eSBmcm9tIHBsYXllclxyXG4gICAgICAgICAgICAgICAgYWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpID09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBhdXNlKHRydWUsIHRydWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5wbGF5aW5nKHRydWUsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkVXBFdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1vdmUoKTogR2FtZS7Gki5WZWN0b3IzIHtcclxuICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiV1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgKz0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiQVwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggLT0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiU1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgLT0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiRFwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggKz0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdhbWUuYXZhdGFyMS5tb3ZlKG1vdmVWZWN0b3IpO1xyXG4gICAgICAgIHJldHVybiBtb3ZlVmVjdG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFiaWxpdHkoKSB7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmRvQWJpbGl0eSgpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuICAgICAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vbGVmdCBtb3VzZSBidXR0b24gcGxheWVyLmF0dGFja1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuYXR0YWNrKGRpcmVjdGlvbiwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiByaWdodCBtb3VzZSBidXR0b24gcGxheWVyLmhlYXZ5QXR0YWNrIG9yIHNvbWV0aGluZyBsaWtlIHRoYXRcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG59IiwibmFtZXNwYWNlIExldmVsIHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTGFuZHNjYXBlIGV4dGVuZHMgxpIuTm9kZXtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9uYW1lKTtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuZ2V0Q2hpbGRyZW4oKVswXS5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0pLm10eExvY2FsLnRyYW5zbGF0ZVooLTIpXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCIvLy88cmVmZXJlbmNlIHBhdGg9XCIuLi9GVURHRS9OZXQvQnVpbGQvQ2xpZW50L0Z1ZGdlQ2xpZW50LmQudHNcIi8+XHJcblxyXG5uYW1lc3BhY2UgTmV0d29ya2luZyB7XHJcbiAgICBleHBvcnQgZW51bSBGVU5DVElPTiB7XHJcbiAgICAgICAgQ09OTkVDVEVELFxyXG4gICAgICAgIFNFVEdBTUVTVEFURSxcclxuICAgICAgICBMT0FERUQsXHJcbiAgICAgICAgSE9TVCxcclxuICAgICAgICBTRVRSRUFEWSxcclxuICAgICAgICBTUEFXTixcclxuICAgICAgICBUUkFOU0ZPUk0sXHJcbiAgICAgICAgQ0xJRU5UTU9WRU1FTlQsXHJcbiAgICAgICAgU0VSVkVSQlVGRkVSLFxyXG4gICAgICAgIFVQREFURUlOVkVOVE9SWSxcclxuICAgICAgICBLTk9DS0JBQ0tSRVFVRVNULFxyXG4gICAgICAgIEtOT0NLQkFDS1BVU0gsXHJcbiAgICAgICAgU1BBV05CVUxMRVQsXHJcbiAgICAgICAgQlVMTEVUUFJFRElDVElPTixcclxuICAgICAgICBCVUxMRVRUUkFOU0ZPUk0sXHJcbiAgICAgICAgQlVMTEVURElFLFxyXG4gICAgICAgIFNQQVdORU5FTVksXHJcbiAgICAgICAgRU5FTVlUUkFOU0ZPUk0sXHJcbiAgICAgICAgRU5USVRZQU5JTUFUSU9OU1RBVEUsXHJcbiAgICAgICAgRU5FTVlESUUsXHJcbiAgICAgICAgU1BBV05JTlRFUk5BTElURU0sXHJcbiAgICAgICAgVVBEQVRFQVRUUklCVVRFUyxcclxuICAgICAgICBVUERBVEVXRUFQT04sXHJcbiAgICAgICAgSVRFTURJRSxcclxuICAgICAgICBTRU5EUk9PTSxcclxuICAgICAgICBTV0lUQ0hST09NUkVRVUVTVCxcclxuICAgICAgICBVUERBVEVCVUZGLFxyXG4gICAgICAgIFVQREFURVVJXHJcbiAgICB9XHJcblxyXG4gICAgaW1wb3J0IMaSQ2xpZW50ID0gRnVkZ2VOZXQuRnVkZ2VDbGllbnQ7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjbGllbnQ6IMaSQ2xpZW50O1xyXG4gICAgZXhwb3J0IGxldCBjbGllbnRzOiBBcnJheTx7IGlkOiBzdHJpbmcsIHJlYWR5OiBib29sZWFuIH0+ID0gW107XHJcbiAgICBleHBvcnQgbGV0IHBvc1VwZGF0ZTogxpIuVmVjdG9yMztcclxuICAgIGV4cG9ydCBsZXQgc29tZW9uZUlzSG9zdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBlbmVteTogRW5lbXkuRW5lbXk7XHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnRJRHM6IG51bWJlcltdID0gW107XHJcblxyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0U3Bhd25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHsgc3Bhd25QbGF5ZXIoKSB9LCB0cnVlKTtcclxuICAgIGxldCBJUENvbm5lY3Rpb24gPSA8SFRNTElucHV0RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklQQ29ubmVjdGlvblwiKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ29ubmVjdGluZ1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgY29ubmVjdGluZywgdHJ1ZSk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjb25uZWN0aW5nKCkge1xyXG4gICAgICAgIGNsaWVudCA9IG5ldyDGkkNsaWVudCgpO1xyXG4gICAgICAgIGNsaWVudC5hZGRFdmVudExpc3RlbmVyKEZ1ZGdlTmV0LkVWRU5ULk1FU1NBR0VfUkVDRUlWRUQsIHJlY2VpdmVNZXNzYWdlKTtcclxuICAgICAgICBjbGllbnQuY29ubmVjdFRvU2VydmVyKElQQ29ubmVjdGlvbi52YWx1ZSk7XHJcblxyXG4gICAgICAgIGFkZENsaWVudElEKClcclxuXHJcbiAgICAgICAgZnVuY3Rpb24gYWRkQ2xpZW50SUQoKSB7XHJcbiAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgb2JqOiB7IGlkOiBzdHJpbmcsIHJlYWR5OiBib29sZWFuIH0gPSB7IGlkOiBjbGllbnQuaWQsIHJlYWR5OiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgY2xpZW50cy5wdXNoKG9iaik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KGFkZENsaWVudElELCAzMDApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gcmVjZWl2ZU1lc3NhZ2UoX2V2ZW50OiBDdXN0b21FdmVudCB8IE1lc3NhZ2VFdmVudCB8IEV2ZW50KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICAgICAgaWYgKF9ldmVudCBpbnN0YW5jZW9mIE1lc3NhZ2VFdmVudCkge1xyXG4gICAgICAgICAgICBsZXQgbWVzc2FnZTogRnVkZ2VOZXQuTWVzc2FnZSA9IEpTT04ucGFyc2UoX2V2ZW50LmRhdGEpO1xyXG5cclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uTE9BREVELnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUubG9hZGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCA9PSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQpIHtcclxuICAgICAgICAgICAgICAgIC8vVE9ETzogbmVlZCBtYXVyaWNlIVxyXG4gICAgICAgICAgICAgICAgLy9UT0RPOiBkbyBwcmVkaWN0aW9uIGhlcmU/XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBjbGllbnQgdG8gYXJyYXkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IG1lc3NhZ2UuY29udGVudC52YWx1ZSkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaCh7IGlkOiBtZXNzYWdlLmNvbnRlbnQudmFsdWUsIHJlYWR5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUR0FNRVNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcoZmFsc2UsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFtZXNzYWdlLmNvbnRlbnQucGxheWluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wYXVzZShmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL0ZST00gQ0xJRU5UIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBsYXllcnM6IEVudGl0eS5FbnRpdHlbXSA9IEdhbWUuZW50aXRpZXMuZmlsdGVyKGVudGl0eSA9PiBlbnRpdHkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eTogRW50aXR5LkVudGl0eSA9IHBsYXllcnMuZmluZChwbGF5ZXIgPT4gcGxheWVyLm5ldElkICE9IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dFZlY3RvciA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dDogSW50ZXJmYWNlcy5JbnB1dFBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5pbnB1dC50aWNrLCBpbnB1dFZlY3RvcjogaW5wdXRWZWN0b3IsIGRvZXNBYmlsaXR5OiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuZG9lc0FiaWxpdHkgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVudGl0eSkuc2VydmVyLnVwZGF0ZUVudGl0eVRvQ2hlY2sobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbnRpdHkpLnNlcnZlci5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE8gQ0xJRU5UXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VSVkVSQlVGRkVSLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbnRpdHkgPT4gZW50aXR5Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZTogSW50ZXJmYWNlcy5TdGF0ZVBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5idWZmZXIudGljaywgcG9zaXRpb246IHBvc2l0aW9uLCBkb2VzQWJpbGl0eTogbWVzc2FnZS5jb250ZW50LmJ1ZmZlci5kb2VzQWJpbGl0eSB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVudGl0eSkuY2xpZW50Lm9uU2VydmVyTW92ZW1lbnRTdGF0ZShzdGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU2V0IGNsaWVudCByZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFVFJFQURZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGF2YXRhcjIgYXMgcmFuZ2VkIG9yIG1lbGVlIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldElkOiBudW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQubmV0SWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMgPSBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBhdHRyaWJ1dGVzLCBuZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gRW50aXR5LklELlJBTkdFRCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMgPSBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyID0gbmV3IFBsYXllci5SYW5nZWQoRW50aXR5LklELlJBTkdFRCwgYXR0cmlidXRlcywgbmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIDApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChHYW1lLmF2YXRhcjIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1J1bnRpbWUgdXBkYXRlcyBhbmQgY29tbXVuaWNhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGF2YXRhcjIgcG9zaXRpb24gYW5kIHJvdGF0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgdGVzdDogR2FtZS7Gki5WZWN0b3IzID0gbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyAvLyBjb25zb2xlLmxvZyh0ZXN0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJvdGF0ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5hdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG1vdmVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnJvdGF0aW9uID0gcm90YXRlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jb2xsaWRlci5wb3NpdGlvbiA9IG1vdmVWZWN0b3IudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAvLyBHYW1lLmF2YXRhcjIuYXZhdGFyUHJlZGljdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVXBkYXRlIGludmVudG9yeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEl0ZW1zLkl0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSXRlbXMuZ2V0QnVmZkl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pdGVtSWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pdGVtSWQsIMaSLlZlY3RvcjIuWkVSTygpLCBtZXNzYWdlLmNvbnRlbnQuaXRlbU5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoSXRlbXMuZ2V0SW50ZXJuYWxJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaXRlbUlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgxpIuVmVjdG9yMi5aRVJPKCksIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW0pLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkuaXRlbXMucHVzaChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9DbGllbnQgcmVxdWVzdCBmb3IgbW92ZSBrbm9ja2JhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0hvc3QgcHVzaCBtb3ZlIGtub2NrYmFjayBmcm9tIGVuZW15XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5OiBFbnRpdHkuRW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQub3duZXJOZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBlbnRpdHkud2VhcG9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHJlZiA9IEdhbWUuYnVsbGV0c0pTT04uZmluZChidWxsZXQgPT4gYnVsbGV0LnR5cGUgPT0gd2VhcG9uLmJ1bGxldFR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY2l0b246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoICg8V2VhcG9ucy5BSU0+bWVzc2FnZS5jb250ZW50LmFpbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBXZWFwb25zLkFJTS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSBuZXcgQnVsbGV0cy5CdWxsZXQocmVmLm5hbWUsIHJlZi5zcGVlZCwgcmVmLmhpdFBvaW50c1NjYWxlLCByZWYubGlmZXRpbWUsIHJlZi5rbm9ja2JhY2tGb3JjZSwgcmVmLmtpbGxjb3VudCwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY2l0b24sIGVudGl0eS5uZXRJZCwgbWVzc2FnZS5jb250ZW50LmJ1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIFdlYXBvbnMuQUlNLkhPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXRUYXJnZXQ6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSBuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQocmVmLm5hbWUsIHJlZi5zcGVlZCwgcmVmLmhpdFBvaW50c1NjYWxlLCByZWYubGlmZXRpbWUsIHJlZi5rbm9ja2JhY2tGb3JjZSwgcmVmLmtpbGxjb3VudCwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY2l0b24sIGVudGl0eS5uZXRJZCwgYnVsbGV0VGFyZ2V0LCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogYnVsbGV0LnNwZWVkKVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBidWxsZXQgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb3RhdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLm10eExvY2FsLnJvdGF0aW9uID0gbmV3Um90YXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vUHJlZGljdCBidWxsZXQgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVUUFJFRElDVElPTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5ob3N0UG9zaXRpb25zW21lc3NhZ2UuY29udGVudC50aWNrXSA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgYnVsbGV0IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVERJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0ID0gR2FtZS5idWxsZXRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWxsZXQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldC5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGVuZW15IGF0IHRoZSBjbGllbnQgXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdORU5FTVkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBjaGFuZ2UgYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYXR0cmlidXRlczogRW50aXR5LkF0dHJpYnV0ZXMgPSBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5uZXR3b3JrU3Bhd25CeUlkKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5lbmVteUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgxpIuVmVjdG9yMihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBhdHRyaWJ1dGVzLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQsIG1lc3NhZ2UuY29udGVudC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgZW5lbXkgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbXkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYW5pbWF0aW9uIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5zd2l0Y2hBbmltYXRpb24obWVzc2FnZS5jb250ZW50LnN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGVuZW15IGF0IHRoZSBjbGllbnQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbmVteSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSBFbnRpdHkgYnVmZiBMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUJVRkYudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgYnVmZkxpc3Q6IEJ1ZmYuQnVmZltdID0gPEJ1ZmYuQnVmZltdPm1lc3NhZ2UuY29udGVudC5idWZmTGlzdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdCdWZmczogQnVmZi5CdWZmW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZMaXN0LmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChidWZmLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQnVmZi5CVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZnMucHVzaChuZXcgQnVmZi5EYW1hZ2VCdWZmKGJ1ZmYuaWQsIGJ1ZmYuZHVyYXRpb24sIGJ1ZmYudGlja1JhdGUsICg8QnVmZi5EYW1hZ2VCdWZmPmJ1ZmYpLnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmJ1ZmZzLmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGZsYWc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWZmcy5mb3JFYWNoKG5ld0J1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZi5pZCA9PSBuZXdCdWZmLmlkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBmbGFnID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFmbGFnKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5yZW1vdmVDaGlsZChlbnRpdHkuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSBidWZmLmlkKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmJ1ZmZzID0gbmV3QnVmZnM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFVUkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiDGki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHBvc2l0aW9uLnRvVmVjdG9yMygpLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBpdGVtIGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTklOVEVSTkFMSVRFTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSXRlbXMuZ2V0QnVmZkl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBJdGVtcy5CdWZmSXRlbShtZXNzYWdlLmNvbnRlbnQuaWQsIG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSksIG1lc3NhZ2UuY29udGVudC5uZXRJZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoSXRlbXMuZ2V0SW50ZXJuYWxJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSwgbWVzc2FnZS5jb250ZW50Lm5ldElkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IGl0ZW0gYXR0cmlidXRlc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVBVFRSSUJVVEVTLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBBdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzID0gdGVtcEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuc2NhbGUsIEdhbWUuYXZhdGFyMi5hdHRyaWJ1dGVzLnNjYWxlLCBHYW1lLmF2YXRhcjIuYXR0cmlidXRlcy5zY2FsZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IHdlYXBvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVXRUFQT04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVtcFdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24obWVzc2FnZS5jb250ZW50LndlYXBvbi5jb29sZG93blRpbWUsIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYXR0YWNrQ291bnQsIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYnVsbGV0VHlwZSwgbWVzc2FnZS5jb250ZW50LndlYXBvbi5wcm9qZWN0aWxlQW1vdW50LCBtZXNzYWdlLmNvbnRlbnQud2VhcG9uLm93bmVyLCBtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmFpbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPkdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSkud2VhcG9uID0gdGVtcFdlYXBvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLklURU1ESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbmVtID0+ICg8SXRlbXMuSXRlbT5lbmVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBvcElEKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gc2VuZCBpcyBob3N0TWVzc2FnZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5IT1NULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHNvbWVvbmVJc0hvc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByb29tIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbTogR2VuZXJhdGlvbi5Sb29tID0gbmV3IEdlbmVyYXRpb24uUm9vbShtZXNzYWdlLmNvbnRlbnQubmFtZSwgbWVzc2FnZS5jb250ZW50LmNvb3JkaWFudGVzLCBtZXNzYWdlLmNvbnRlbnQuZXhpdHMsIG1lc3NhZ2UuY29udGVudC5yb29tVHlwZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC5kaXJlY2l0b24gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uYWRkUm9vbVRvR3JhcGgocm9vbSwgbWVzc2FnZS5jb250ZW50LmRpcmVjaXRvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uYWRkUm9vbVRvR3JhcGgocm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZW5kIHJlcXVlc3QgdG8gc3dpdGNoIHJvb21zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50cm9vbSA9IEdlbmVyYXRpb24ucm9vbXMuZmluZChlbGVtID0+IGVsZW0uY29vcmRpbmF0ZXNbMF0gPT0gKDxbbnVtYmVyLCBudW1iZXJdPm1lc3NhZ2UuY29udGVudC5jb29yZGlhbnRlcylbMF0gJiZcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbGVtLmNvb3JkaW5hdGVzWzFdID09ICg8W251bWJlciwgbnVtYmVyXT5tZXNzYWdlLmNvbnRlbnQuY29vcmRpYW50ZXMpWzFdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20oY3VycmVudHJvb20sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50UmVhZHkoKSB7XHJcbiAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBjbGllbnQuaWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRSRUFEWSwgbmV0SWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRHYW1lc3RhdGUoX3BsYXlpbmc6IGJvb2xlYW4pIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVEdBTUVTVEFURSwgcGxheWluZzogX3BsYXlpbmcgfSB9KTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIHBsYXllclxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldEhvc3QoKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkhPU1QsIGlkOiBjbGllbnQuaWQgfSB9KTtcclxuICAgICAgICAgICAgaWYgKCFzb21lb25lSXNIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBjbGllbnQuYmVjb21lSG9zdCgpO1xyXG4gICAgICAgICAgICAgICAgc29tZW9uZUlzSG9zdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzb21lb25lSXNIb3N0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGxvYWRlZCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5MT0FERUQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25QbGF5ZXIoKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuYXZhdGFyMS5pZCA9PSBFbnRpdHkuSUQuTUVMRUUpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IEVudGl0eS5JRC5NRUxFRSwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELlJBTkdFRCwgYXR0cmlidXRlczogR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMsIHBvc2l0aW9uOiBHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogR2FtZS5hdmF0YXIxLm5ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogTmV0d29ya2luZy5GVU5DVElPTi5DT05ORUNURUQsIHZhbHVlOiBOZXR3b3JraW5nLmNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVBdmF0YXJQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9yb3RhdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVFJBTlNGT1JNLCB2YWx1ZTogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZENsaWVudElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklucHV0UGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULCBuZXRJZDogX25ldElkLCBpbnB1dDogX2lucHV0UGF5bG9hZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRTZXJ2ZXJCdWZmZXIoX25ldElkOiBudW1iZXIsIF9idWZmZXI6IEludGVyZmFjZXMuU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFUlZFUkJVRkZFUiwgbmV0SWQ6IF9uZXRJZCwgYnVmZmVyOiBfYnVmZmVyIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1JlcXVlc3QoX25ldElkOiBudW1iZXIsIF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1JFUVVFU1QsIG5ldElkOiBfbmV0SWQsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tQdXNoKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gsIGtub2NrYmFja0ZvcmNlOiBfa25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uOiBfcG9zaXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVJbnZlbnRvcnkoX2l0ZW1JZDogSXRlbXMuSVRFTUlELCBfaXRlbU5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIGl0ZW1JZDogX2l0ZW1JZCwgaXRlbU5ldElkOiBfaXRlbU5ldElkLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBidWxsZXRcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkJ1bGxldChfYWltVHlwZTogV2VhcG9ucy5BSU0sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYnVsbGV0VGFyZ2V0PzogxpIuVmVjdG9yMykge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOQlVMTEVULCBhaW1UeXBlOiBfYWltVHlwZSwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uLCBvd25lck5ldElkOiBfb3duZXJOZXRJZCwgYnVsbGV0TmV0SWQ6IF9idWxsZXROZXRJZCwgYnVsbGV0VGFyZ2V0OiBfYnVsbGV0VGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlciwgX3RpY2s/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCByb3RhdGlvbjogX3JvdGF0aW9uLCBuZXRJZDogX25ldElkLCB0aWNrOiBfdGljayB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHByZWRpY3Rpb25CdWxsZXQoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlciwgX3RpY2s/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVUUFJFRElDVElPTiwgcG9zaXRpb246IF9wb3NpdGlvbiwgbmV0SWQ6IF9uZXRJZCwgdGljazogX3RpY2sgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBlbmVteVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduRW5lbXkoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9lbmVteTogRW5lbXkuRW5lbXksIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdORU5FTVksIGVuZW15Q2xhc3M6IF9lbmVteUNsYXNzLCBpZDogX2VuZW15LmlkLCBhdHRyaWJ1dGVzOiBfZW5lbXkuYXR0cmlidXRlcywgcG9zaXRpb246IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IF9uZXRJZCwgdGFyZ2V0OiBfZW5lbXkudGFyZ2V0IH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW5lbXlQb3NpdGlvbihfcG9zaXRpb246IMaSLlZlY3RvcjMsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUFuaW1hdGlvblN0YXRlKF9zdGF0ZTogRW50aXR5LkFOSU1BVElPTlNUQVRFUywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZWxzZSB7XHJcbiAgICAgICAgLy8gICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLCBzdGF0ZTogX3N0YXRlLCBuZXRJZDogX25ldElkIH0gfSlcclxuXHJcbiAgICAgICAgLy8gfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHJlbW92ZUVuZW15KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5FTVlESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gaXRlbXNcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkl0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0sIF9pZDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLCBpdGVtOiBfaXRlbSwgaWQ6IF9pZCwgcG9zaXRpb246IF9wb3NpdGlvbiwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgYXR0cmlidXRlczogX2F0dHJpYnV0ZXMsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIGF0dHJpYnV0ZXM6IF9hdHRyaWJ1dGVzLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhcldlYXBvbihfd2VhcG9uOiBXZWFwb25zLldlYXBvbiwgX3RhcmdldE5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uLCBuZXRJZDogX3RhcmdldE5ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVJdGVtKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uIGJ1ZmZzXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVmZkxpc3QoX2J1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQlVGRiwgYnVmZkxpc3Q6IF9idWZmTGlzdCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBVSVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVVSSwgcG9zaXRpb246IF9wb3NpdGlvbiwgdmFsdWU6IF92YWx1ZSB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcm9vbVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRSb29tKF9uYW1lOiBzdHJpbmcsIF9jb29yZGlhbnRlczogW251bWJlciwgbnVtYmVyXSwgX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0sIF9yb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRSwgX2RpcmVjaXRvbj86IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSkge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRU5EUk9PTSwgbmFtZTogX25hbWUsIGNvb3JkaWFudGVzOiBfY29vcmRpYW50ZXMsIGV4aXRzOiBfZXhpdHMsIHJvb21UeXBlOiBfcm9vbVR5cGUsIGRpcmVjaXRvbjogX2RpcmVjaXRvbiB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb21SZXF1ZXN0KF9jb29yZGlhbnRlczogW251bWJlciwgbnVtYmVyXSwgX2RpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnQuaWRIb3N0LCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNXSVRDSFJPT01SRVFVRVNULCBjb29yZGlhbnRlczogX2Nvb3JkaWFudGVzLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24gfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpZEdlbmVyYXRvcigpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBpZCA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwMDApO1xyXG4gICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoY3VySUQgPT4gY3VySUQgPT0gaWQpKSB7XHJcbiAgICAgICAgICAgIGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIGlkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwb3BJRChfaWQ6IG51bWJlcikge1xyXG4gICAgICAgIGxldCBpbmRleDogbnVtYmVyO1xyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY3VycmVudElEcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoY3VycmVudElEc1tpXSA9PSBfaWQpIHtcclxuICAgICAgICAgICAgICAgIGluZGV4ID0gaTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGN1cnJlbnRJRHMuc3BsaWNlKGluZGV4LCAxKTtcclxuICAgIH1cclxuXHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImJlZm9yZXVubG9hZFwiLCBvblVubG9hZCwgZmFsc2UpO1xyXG5cclxuICAgIGZ1bmN0aW9uIG9uVW5sb2FkKCkge1xyXG4gICAgICAgIC8vVE9ETzogVGhpbmdzIHdlIGRvIGFmdGVyIHRoZSBwbGF5ZXIgbGVmdCB0aGUgZ2FtZVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFBsYXllciB7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFBsYXllciBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbigxMiwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCAxLCB0aGlzLm5ldElkLCBXZWFwb25zLkFJTS5OT1JNQUwpO1xyXG5cclxuICAgICAgICBwdWJsaWMgY2xpZW50OiBOZXR3b3JraW5nLkNsaWVudFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIHNlcnZlcjogTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2F0dHJpYnV0ZXMsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50ID0gbmV3IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5zZXJ2ZXIgPSBuZXcgTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uKHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPT0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRDb2xsaWRlcigpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zY2FsZU1vdmVWZWN0b3IoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uYWRkKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24uc3VidHJhY3QoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICBsZXQgZG9vcnM6IEdlbmVyYXRpb24uRG9vcltdID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkuZG9vcnM7XHJcbiAgICAgICAgICAgIGRvb3JzLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICg8R2VuZXJhdGlvbi5Eb29yPmVsZW1lbnQpLmNoYW5nZVJvb20oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc2NhbGVNb3ZlVmVjdG9yKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIHRoaXMgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgodGhpcy5jbGllbnQubWluVGltZUJldHdlZW5UaWNrcyAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcHJlZGljdCgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbGllbnQudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUoSW5wdXRTeXN0ZW0ubW92ZSgpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2VydmVyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0SXRlbUNvbGxpc2lvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgbGV0IGVuZW1pZXNDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICBlbmVtaWVzLmZvckVhY2goZWxlbWVudCA9PiB7XHJcbiAgICAgICAgICAgICAgICBlbmVtaWVzQ29sbGlkZXIucHVzaChlbGVtZW50LmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVDb2xsaWRlcihlbmVtaWVzQ29sbGlkZXIsIF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1Db2xsaXNpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtQ29sbGlkZXI6IEl0ZW1zLkl0ZW1bXSA9IEdhbWUuaXRlbXM7XHJcbiAgICAgICAgICAgIGl0ZW1Db2xsaWRlci5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoaXRlbS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShpdGVtLmlkLCBpdGVtLm5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLmRvWW91clRoaW5nKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMucHVzaChpdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkludGVybmFsSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5CdWZmSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArIEJ1ZmYuQlVGRklEWyg8SXRlbXMuQnVmZkl0ZW0+aXRlbSkuYnVmZlswXS5pZF0udG9TdHJpbmcoKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gKDxFbmVteS5FbmVteT5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGJsb2NrOiBBYmlsaXR5LkJsb2NrID0gbmV3IEFiaWxpdHkuQmxvY2sodGhpcy5uZXRJZCwgNjAwLCAxLCA1ICogNjApO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCwgX3N5bmMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9CbG9ja1xyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG5cclxuICAgICAgICBwdWJsaWMgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCAxNTAsIDEsIDUgKjYwLCAyKTtcclxuICAgICAgICBwZXJmb3JtQWJpbGl0eTogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxhc3RNb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgc3VwZXIubW92ZSh0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9EYXNoXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBlbnVtIFJPT01UWVBFIHtcclxuICAgICAgICBTVEFSVCxcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgVFJFQVNVUkUsXHJcbiAgICAgICAgQ0hBTExFTkdFLFxyXG4gICAgICAgIEJPU1NcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFN0YXJ0Um9vbTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UgPSBuZXcgR2FtZS7Gki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUm9vbSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlJPT007XHJcbiAgICAgICAgcHVibGljIHJvb21UeXBlOiBST09NVFlQRVxyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogW251bWJlciwgbnVtYmVyXTsgLy8gWCBZXHJcbiAgICAgICAgcHVibGljIHdhbGxzOiBXYWxsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgZG9vcnM6IERvb3JbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBmaW5pc2hlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHB1YmxpYyBlbmVteUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgbmVpZ2hib3VyTjogUm9vbTtcclxuICAgICAgICBuZWlnaGJvdXJFOiBSb29tO1xyXG4gICAgICAgIG5laWdoYm91clM6IFJvb207XHJcbiAgICAgICAgbmVpZ2hib3VyVzogUm9vbTtcclxuICAgICAgICByb29tU2l6ZTogbnVtYmVyID0gMzA7XHJcbiAgICAgICAgZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSAvLyBOIEUgUyBXXHJcbiAgICAgICAgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCk7XHJcbiAgICAgICAgc3RhcnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U3RhcnRSb29tKSk7XHJcbiAgICAgICAgbm9ybWFsUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJub3JtYWxSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgbWVyY2hhbnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm1lcmNoYW50Um9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpO1xyXG4gICAgICAgIHRyZWFzdXJlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ0cmVhc3VyZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwieWVsbG93XCIpKSk7XHJcbiAgICAgICAgY2hhbGxlbmdlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJjaGFsbGVuZ2VSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKTtcclxuICAgICAgICBib3NzUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJib3NzUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibGFja1wiKSkpO1xyXG5cclxuXHJcbiAgICAgICAgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX2Nvb3JkaWFudGVzOiBbbnVtYmVyLCBudW1iZXJdLCBfZXhpdHM6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSBfZXhpdHM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3Jvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDI7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnN0YXJ0Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMCkgKyAyMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMubm9ybWFsUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLm1lcmNoYW50Um9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tU2l6ZSA9IDg7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnRyZWFzdXJlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmVuZW15Q291bnQgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAyMCkgKyAzMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuY2hhbGxlbmdlUm9vbU1hdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYm9zc1Jvb21NYXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJvb21TaXplLCB0aGlzLnJvb21TaXplLCAwKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjModGhpcy5jb29yZGluYXRlc1swXSAqIHRoaXMucm9vbVNpemUsIHRoaXMuY29vcmRpbmF0ZXNbMV0gKiB0aGlzLnJvb21TaXplLCAtMC4wMSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1lc2gpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudCh0aGlzLmNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW3RydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2VdKSk7XHJcbiAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaChuZXcgV2FsbCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5yb29tU2l6ZSwgW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIHRydWVdKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0RG9vcnMoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzBdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFt0cnVlLCBmYWxzZSwgZmFsc2UsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzFdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgdHJ1ZSwgZmFsc2UsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzJdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgZmFsc2UsIHRydWUsIGZhbHNlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzWzNdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvb3JzLnB1c2gobmV3IERvb3IodGhpcywgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIFtmYWxzZSwgZmFsc2UsIGZhbHNlLCB0cnVlXSwgdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuZG9vcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5kb29yc1tpXSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb29tU2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yb29tU2l6ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFdhbGwgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5XQUxMO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgcHVibGljIHdhbGxUaGlja25lc3M6IG51bWJlciA9IDM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfd2lkdGg6IG51bWJlciwgX2RpcmVjdGlvbjogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiV2FsbFwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcInJlZFwiKSkpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IF9wb3NpdGlvbi50b1ZlY3RvcjMoMCk7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMF0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKz0gX3dpZHRoIC8gMiArIHRoaXMud2FsbFRoaWNrbmVzcyAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfd2lkdGggKyB0aGlzLndhbGxUaGlja25lc3MgKiAyLCB0aGlzLndhbGxUaGlja25lc3MsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMud2FsbFRoaWNrbmVzcywgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzFdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICs9IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy53YWxsVGhpY2tuZXNzLCBfd2lkdGgsIDApO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLndhbGxUaGlja25lc3MsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzJdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC09IF93aWR0aCAvIDIgKyB0aGlzLndhbGxUaGlja25lc3MgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMoX3dpZHRoICsgdGhpcy53YWxsVGhpY2tuZXNzICogMiwgdGhpcy53YWxsVGhpY2tuZXNzLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLndhbGxUaGlja25lc3MsIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblszXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtPSBfd2lkdGggLyAyICsgdGhpcy53YWxsVGhpY2tuZXNzIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMud2FsbFRoaWNrbmVzcywgX3dpZHRoLCAwKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy53YWxsVGhpY2tuZXNzLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5ET09SO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcbiAgICAgICAgcHVibGljIGRvb3JXaWR0aDogbnVtYmVyID0gMztcclxuICAgICAgICBwdWJsaWMgZG9vclRoaWNrbmVzczogbnVtYmVyID0gMTtcclxuICAgICAgICBwdWJsaWMgcGFyZW50Um9vbTogUm9vbTtcclxuXHJcbiAgICAgICAgZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl07XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wYXJlbnQ6IFJvb20sIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0sIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiRG9vclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5wYXJlbnRSb29tID0gX3BhcmVudDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwicmVkXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzBdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICs9IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JXaWR0aCwgdGhpcy5kb29yVGhpY2tuZXNzLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb25bMV0pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKz0gX3Jvb21TaXplIC8gMjtcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMuZG9vclRoaWNrbmVzcywgdGhpcy5kb29yV2lkdGgsIDAuMDAxKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvblsyXSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSAtPSBfcm9vbVNpemUgLyAyO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5kb29yV2lkdGgsIHRoaXMuZG9vclRoaWNrbmVzcywgMC4wMDEpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBHYW1lLsaSLlJlY3RhbmdsZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55LCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54IC09IF9yb29tU2l6ZSAvIDI7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmRvb3JUaGlja25lc3MsIHRoaXMuZG9vcldpZHRoLCAwLjAwMSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy55LCBHYW1lLsaSLk9SSUdJTjJELkNFTlRFUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjaGFuZ2VSb29tKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20odGhpcy5wYXJlbnRSb29tLCB0aGlzLmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnN3aXRjaFJvb21SZXF1ZXN0KHRoaXMucGFyZW50Um9vbS5jb29yZGluYXRlcywgdGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSAzO1xyXG4gICAgbGV0IHVzZWRQb3NpdGlvbnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCByb29tczogUm9vbVtdID0gW107XHJcblxyXG4gICAgLy9zcGF3biBjaGFuY2VzXHJcbiAgICBsZXQgY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlOiBudW1iZXIgPSAzMDtcclxuICAgIGxldCB0cmVhc3VyZVJvb21TcGF3bkNoYW5jZTogbnVtYmVyID0gMTAwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZVJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIGxldCBzdGFydENvb3JkczogW251bWJlciwgbnVtYmVyXSA9IFswLCAwXTtcclxuXHJcbiAgICAgICAgcm9vbXMucHVzaChuZXcgUm9vbShcInJvb21TdGFydFwiLCBzdGFydENvb3JkcywgY2FsY1BhdGhFeGl0cyhzdGFydENvb3JkcyksIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQpKVxyXG4gICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChzdGFydENvb3Jkcyk7XHJcblxyXG4gICAgICAgIGZvciAobGV0IGk6IG51bWJlciA9IDA7IGkgPCBudW1iZXJPZlJvb21zOyBpKyspIHtcclxuICAgICAgICAgICAgYWRkUm9vbShyb29tc1tyb29tcy5sZW5ndGggLSAxXSwgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUwpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBhZGRSb29tKHJvb21zW3Jvb21zLmxlbmd0aCAtIDFdLCBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1MpO1xyXG4gICAgICAgIGFkZFNwZWNpYWxSb29tcygpO1xyXG4gICAgICAgIGFkZFJvb20ocm9vbXNbcm9vbXMubGVuZ3RoIC0gM10sIEdlbmVyYXRpb24uUk9PTVRZUEUuTUVSQ0hBTlQpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUm9vbURvb3JzKHJvb20pO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhyb29tLmNvb3JkaW5hdGVzICsgXCIgXCIgKyByb29tLmV4aXRzICsgXCIgXCIgKyByb29tLnJvb21UeXBlLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgIH0pXHJcblxyXG4gICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcm9vbXMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgcm9vbXNbaV0uc2V0RG9vcnMoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQocm9vbXNbMF0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMF0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMV0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbMl0pO1xyXG4gICAgICAgIEdhbWUuZ3JhcGguYXBwZW5kQ2hpbGQocm9vbXNbMF0ud2FsbHNbM10pO1xyXG5cclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zWzBdLmRvb3JzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQocm9vbXNbMF0uZG9vcnNbaV0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2VuZFJvb20ocm9vbXNbMF0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNlbmRSb29tKF9yb29tOiBSb29tLCBfZGlyZWNpdG9uPzogW2Jvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW4sIGJvb2xlYW5dKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5zZW5kUm9vbShfcm9vbS5uYW1lLCBfcm9vbS5jb29yZGluYXRlcywgX3Jvb20uZXhpdHMsIF9yb29tLnJvb21UeXBlLCBfZGlyZWNpdG9uKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBhZGRSb29tKF9jdXJyZW50Um9vbTogUm9vbSwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKTogdm9pZCB7XHJcbiAgICAgICAgbGV0IG51bWJlck9mRXhpdHM6IG51bWJlciA9IGNvdW50Qm9vbChfY3VycmVudFJvb20uZXhpdHMpO1xyXG4gICAgICAgIGxldCByYW5kb21OdW1iZXI6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChudW1iZXJPZkV4aXRzIC0gMSkpO1xyXG4gICAgICAgIGxldCBwb3NzaWJsZUV4aXRJbmRleDogbnVtYmVyW10gPSBnZXRFeGl0SW5kZXgoX2N1cnJlbnRSb29tLmV4aXRzKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhfcm9vbVR5cGUgKyBcIjogXCIgKyBwb3NzaWJsZUV4aXRJbmRleCArIFwiX19fXyBcIiArIHJhbmRvbU51bWJlcik7XHJcbiAgICAgICAgbGV0IG5ld1Jvb21Qb3NpdGlvbjogW251bWJlciwgbnVtYmVyXTtcclxuICAgICAgICBsZXQgbmV3Um9vbTogUm9vbTtcclxuXHJcbiAgICAgICAgc3dpdGNoIChwb3NzaWJsZUV4aXRJbmRleFtyYW5kb21OdW1iZXJdKSB7XHJcbiAgICAgICAgICAgIGNhc2UgMDogLy8gbm9ydGhcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0sIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXSArIDFdO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20ubmVpZ2hib3VyUyA9IF9jdXJyZW50Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgMTogLy8gZWFzdFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSArIDEsIF9jdXJyZW50Um9vbS5jb29yZGluYXRlc1sxXV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91ckUgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJXID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAyOiAvLyBzb3V0aFxyXG4gICAgICAgICAgICAgICAgbmV3Um9vbVBvc2l0aW9uID0gW19jdXJyZW50Um9vbS5jb29yZGluYXRlc1swXSwgX2N1cnJlbnRSb29tLmNvb3JkaW5hdGVzWzFdIC0gMV07XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IFJvb20oXCJyb29tTm9ybWFsXCIsIChuZXdSb29tUG9zaXRpb24pLCBjYWxjUGF0aEV4aXRzKG5ld1Jvb21Qb3NpdGlvbiksIF9yb29tVHlwZSk7XHJcbiAgICAgICAgICAgICAgICByb29tcy5wdXNoKG5ld1Jvb20pO1xyXG4gICAgICAgICAgICAgICAgX2N1cnJlbnRSb29tLm5laWdoYm91clMgPSBuZXdSb29tO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbS5uZWlnaGJvdXJOID0gX2N1cnJlbnRSb29tO1xyXG4gICAgICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5wdXNoKG5ld1Jvb21Qb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSAzOiAvL3dlc3RcclxuICAgICAgICAgICAgICAgIG5ld1Jvb21Qb3NpdGlvbiA9IFtfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMF0gLSAxLCBfY3VycmVudFJvb20uY29vcmRpbmF0ZXNbMV1dO1xyXG4gICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBSb29tKFwicm9vbU5vcm1hbFwiLCAobmV3Um9vbVBvc2l0aW9uKSwgY2FsY1BhdGhFeGl0cyhuZXdSb29tUG9zaXRpb24pLCBfcm9vbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgcm9vbXMucHVzaChuZXdSb29tKTtcclxuICAgICAgICAgICAgICAgIF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXID0gbmV3Um9vbTtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20ubmVpZ2hib3VyRSA9IF9jdXJyZW50Um9vbTtcclxuICAgICAgICAgICAgICAgIHVzZWRQb3NpdGlvbnMucHVzaChuZXdSb29tUG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWRkU3BlY2lhbFJvb21zKCk6IHZvaWQge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIHJvb20uZXhpdHMgPSBjYWxjUGF0aEV4aXRzKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0cmVhc3VyZVJvb21TcGF3bkNoYW5jZSkpIHtcclxuICAgICAgICAgICAgICAgIGFkZFJvb20ocm9vbSwgR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGlzU3Bhd25pbmcoY2hhbGxlbmdlUm9vbVNwYXduQ2hhbmNlKSkge1xyXG4gICAgICAgICAgICAgICAgYWRkUm9vbShyb29tLCBHZW5lcmF0aW9uLlJPT01UWVBFLkNIQUxMRU5HRSlcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGlzU3Bhd25pbmcoX3NwYXduQ2hhbmNlOiBudW1iZXIpOiBib29sZWFuIHtcclxuICAgICAgICBsZXQgeCA9IE1hdGgucmFuZG9tKCkgKiAxMDA7XHJcbiAgICAgICAgaWYgKHggPCBfc3Bhd25DaGFuY2UpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gY291bnRCb29sKF9ib29sOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBjb3VudGVyOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIF9ib29sLmZvckVhY2goYm9vbCA9PiB7XHJcbiAgICAgICAgICAgIGlmIChib29sKSB7XHJcbiAgICAgICAgICAgICAgICBjb3VudGVyKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgICAgICByZXR1cm4gY291bnRlcjtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRFeGl0SW5kZXgoX2V4aXRzOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pOiBudW1iZXJbXSB7XHJcbiAgICAgICAgbGV0IG51bWJlcnM6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfZXhpdHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgaWYgKF9leGl0c1tpXSkge1xyXG4gICAgICAgICAgICAgICAgbnVtYmVycy5wdXNoKGkpXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bWJlcnM7XHJcblxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjYWxjdWxhdGVzIHBvc3NpYmxlIGV4aXRzIGZvciBuZXcgcm9vbXNcclxuICAgICAqIEBwYXJhbSBfcG9zaXRpb24gcG9zaXRpb24gb2Ygcm9vbVxyXG4gICAgICogQHJldHVybnMgYm9vbGVhbiBmb3IgZWFjaCBkaXJlY3Rpb24gbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XHJcbiAgICAgKi9cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUGF0aEV4aXRzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSB7XHJcbiAgICAgICAgbGV0IG5vcnRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IGVhc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgc291dGg6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsZXQgd2VzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCByb29tTmVpZ2hib3VyczogW251bWJlciwgbnVtYmVyXVtdO1xyXG4gICAgICAgIHJvb21OZWlnaGJvdXJzID0gc2xpY2VOZWlnaGJvdXJzKGdldE5laWdoYm91cnMoX3Bvc2l0aW9uKSk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMV0gLSBfcG9zaXRpb25bMV0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHNvdXRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocm9vbU5laWdoYm91cnNbaV1bMF0gLSBfcG9zaXRpb25bMF0gPT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIHdlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyb29tTmVpZ2hib3Vyc1tpXVsxXSAtIF9wb3NpdGlvblsxXSA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICBub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJvb21OZWlnaGJvdXJzW2ldWzBdIC0gX3Bvc2l0aW9uWzBdID09IDEpIHtcclxuICAgICAgICAgICAgICAgIGVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBbbm9ydGgsIGVhc3QsIHNvdXRoLCB3ZXN0XTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBjYWxjUm9vbURvb3JzKF9yb29tOiBHZW5lcmF0aW9uLlJvb20pOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0ge1xyXG4gICAgICAgIGxldCBub3J0aDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIGxldCBlYXN0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHNvdXRoOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGV0IHdlc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBpZiAoX3Jvb20ubmVpZ2hib3VyTiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgbm9ydGggPSB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoX3Jvb20ubmVpZ2hib3VyRSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgZWFzdCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfcm9vbS5uZWlnaGJvdXJTICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBzb3V0aCA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChfcm9vbS5uZWlnaGJvdXJXICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB3ZXN0ID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIFtub3J0aCwgZWFzdCwgc291dGgsIHdlc3RdO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJzKF9wb3NpdGlvbjogW251bWJlciwgbnVtYmVyXSk6IFtudW1iZXIsIG51bWJlcl1bXSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91cnM6IFtudW1iZXIsIG51bWJlcl1bXSA9IFtdXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKFtfcG9zaXRpb25bMF0sIF9wb3NpdGlvblsxXSAtIDFdKTsgLy8gZG93blxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdIC0gMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIGxlZnRcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2goW19wb3NpdGlvblswXSwgX3Bvc2l0aW9uWzFdICsgMV0pOyAvLyB1cFxyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChbX3Bvc2l0aW9uWzBdICsgMSwgX3Bvc2l0aW9uWzFdXSk7IC8vIHJpZ2h0XHJcbiAgICAgICAgcmV0dXJuIG5laWdoYm91cnM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2xpY2VOZWlnaGJvdXJzKF9uZWlnaGJvdXJzOiBbbnVtYmVyLCBudW1iZXJdW10pOiBbbnVtYmVyLCBudW1iZXJdW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzID0gX25laWdoYm91cnM7XHJcbiAgICAgICAgbGV0IHRvUmVtb3ZlSW5kZXg6IG51bWJlcltdID0gW107XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBuZWlnaGJvdXJzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIC8vIGNoZWNrIGljaCBwb3NpdGlvbiBhbHJlYWR5IHVzZWRcclxuICAgICAgICAgICAgdXNlZFBvc2l0aW9ucy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKG5laWdoYm91cnNbaV1bMF0gPT0gcm9vbVswXSAmJiBuZWlnaGJvdXJzW2ldWzFdID09IHJvb21bMV0pIHtcclxuICAgICAgICAgICAgICAgICAgICB0b1JlbW92ZUluZGV4LnB1c2goaSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIGxldCBjb3B5OiBbbnVtYmVyLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICB0b1JlbW92ZUluZGV4LmZvckVhY2goaW5kZXggPT4ge1xyXG4gICAgICAgICAgICBkZWxldGUgbmVpZ2hib3Vyc1tpbmRleF07XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG4gPT4ge1xyXG4gICAgICAgICAgICBjb3B5LnB1c2gobik7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgcmV0dXJuIGNvcHk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb20oX2N1cnJlbnRSb29tOiBSb29tLCBfZGlyZWN0aW9uOiBbYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbiwgYm9vbGVhbl0pIHtcclxuICAgICAgICBpZiAoX2N1cnJlbnRSb29tLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbShfY3VycmVudFJvb20ubmVpZ2hib3VyTiwgW2ZhbHNlLCBmYWxzZSwgdHJ1ZSwgZmFsc2VdKTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJOLCBbZmFsc2UsIGZhbHNlLCB0cnVlLCBmYWxzZV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzFdKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbShfY3VycmVudFJvb20ubmVpZ2hib3VyRSwgW2ZhbHNlLCBmYWxzZSwgZmFsc2UsIHRydWVdKTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJFLCBbZmFsc2UsIGZhbHNlLCBmYWxzZSwgdHJ1ZV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzJdKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbShfY3VycmVudFJvb20ubmVpZ2hib3VyUywgW3RydWUsIGZhbHNlLCBmYWxzZSwgZmFsc2VdKTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJTLCBbdHJ1ZSwgZmFsc2UsIGZhbHNlLCBmYWxzZV0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICBzZW5kUm9vbShfY3VycmVudFJvb20ubmVpZ2hib3VyVywgW2ZhbHNlLCB0cnVlLCBmYWxzZSwgZmFsc2VdKTtcclxuICAgICAgICAgICAgICAgIGFkZFJvb21Ub0dyYXBoKF9jdXJyZW50Um9vbS5uZWlnaGJvdXJXLCBbZmFsc2UsIHRydWUsIGZhbHNlLCBmYWxzZV0pO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRSb29tVG9HcmFwaChfcm9vbTogUm9vbSwgX2RpcmVjaXRvbj86IFtib29sZWFuLCBib29sZWFuLCBib29sZWFuLCBib29sZWFuXSkge1xyXG4gICAgICAgIGxldCBvbGRPYmplY3RzOiBHYW1lLsaSLk5vZGVbXSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5QTEFZRVIpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1swXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1sxXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1syXSk7XHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbS53YWxsc1szXSk7XHJcblxyXG4gICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gX3Jvb20uY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmNsb25lO1xyXG5cclxuICAgICAgICBpZiAoX2RpcmVjaXRvbiAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWNpdG9uWzBdKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbi55ICs9IF9yb29tLnJvb21TaXplIC8gMiAtIDI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY2l0b25bMV0pIHtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uLnggKz0gX3Jvb20ucm9vbVNpemUgLyAyIC0gMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjaXRvblsyXSkge1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24ueSAtPSBfcm9vbS5yb29tU2l6ZSAvIDIgLSAyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWNpdG9uWzNdKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdQb3NpdGlvbi54IC09IF9yb29tLnJvb21TaXplIC8gMiAtIDI7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgbmV3UG9zaXRpb24ueiA9IDA7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG5cclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBfcm9vbS5zZXREb29ycygpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBfcm9vbS5kb29ycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKF9yb29tLmRvb3JzW2ldKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChfcm9vbS5yb29tVHlwZSA9PSBST09NVFlQRS5UUkVBU1VSRSAmJiBOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBhZGQgRXh0ZXJuYWxJdGVtcyByYW5kb21cclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIgPSBfcm9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuXHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggLT0gMjtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUl0ZW1JZDogbnVtYmVyID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKE9iamVjdC5rZXlzKEl0ZW1zLklURU1JRCkubGVuZ3RoIC8gMiAtIDEpKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKHJhbmRvbUl0ZW1JZCwgcG9zaXRpb24pKTtcclxuXHJcbiAgICAgICAgICAgIHBvc2l0aW9uLnggKz0gNDtcclxuICAgICAgICAgICAgcmFuZG9tSXRlbUlkID0gTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogKE9iamVjdC5rZXlzKEl0ZW1zLklURU1JRCkubGVuZ3RoIC8gMiAtIDEpKTtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKHJhbmRvbUl0ZW1JZCwgcG9zaXRpb24pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRBR3tcclxuICAgICAgICBQTEFZRVIsXHJcbiAgICAgICAgRU5FTVksXHJcbiAgICAgICAgQlVMTEVULFxyXG4gICAgICAgIElURU0sXHJcbiAgICAgICAgUk9PTSxcclxuICAgICAgICBXQUxMLFxyXG4gICAgICAgIERPT1IsXHJcbiAgICAgICAgREFNQUdFVUlcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBXZWFwb25zIHtcclxuICAgIGV4cG9ydCBjbGFzcyBXZWFwb24ge1xyXG4gICAgICAgIG93bmVyOiBudW1iZXI7IGdldCBfb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXIpIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xkb3duOiBBYmlsaXR5LkNvb2xkb3duO1xyXG4gICAgICAgIHB1YmxpYyBjb29sZG93blRpbWU6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgYXR0YWNrQ291bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHVibGljIGN1cnJlbnRBdHRhY2tDb3VudDogbnVtYmVyID0gdGhpcy5hdHRhY2tDb3VudDtcclxuICAgICAgICBhaW1UeXBlOiBBSU07XHJcbiAgICAgICAgYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFID0gQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJEO1xyXG4gICAgICAgIHByb2plY3RpbGVBbW91bnQ6IG51bWJlciA9IDE7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29sZG93blRpbWU6IG51bWJlciwgX2F0dGFja0NvdW50OiBudW1iZXIsIF9idWxsZXRUeXBlOiBCdWxsZXRzLkJVTExFVFRZUEUsIF9wcm9qZWN0aWxlQW1vdW50OiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIsIF9haW1UeXBlOiBBSU0pIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sZG93blRpbWUgPSBfY29vbGRvd25UaW1lO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFR5cGUgPSBfYnVsbGV0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aWxlQW1vdW50ID0gX3Byb2plY3RpbGVBbW91bnQ7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICAgICAgdGhpcy5haW1UeXBlID0gX2FpbVR5cGU7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24odGhpcy5jb29sZG93blRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWNpdG9uOiDGki5WZWN0b3IzLCBfYnVsbGV0TmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA8PSAwICYmICF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPSB0aGlzLmF0dGFja0NvdW50O1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50ID4gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWNpdG9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEF0dGFja0NvdW50IDw9IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKHRoaXMuX293bmVyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gKiB0aGlzLmNvb2xkb3duVGltZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbGRvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbWFnYXppbmU6IEJ1bGxldHMuQnVsbGV0W10gPSB0aGlzLmxvYWRNYWdhemluZShfcG9zaXRpb24sIF9kaXJlY2l0b24sIHRoaXMuYnVsbGV0VHlwZSwgX2J1bGxldE5ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVsbGV0RGlyZWN0aW9uKG1hZ2F6aW5lKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmaXJlKF9tYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIF9tYWdhemluZS5mb3JFYWNoKGJ1bGxldCA9PiB7XHJcbiAgICAgICAgICAgICAgICBidWxsZXQuZmx5RGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogYnVsbGV0LnNwZWVkKVxyXG4gICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9zeW5jKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldCBpbnN0YW5jZW9mIEJ1bGxldHMuSG9taW5nQnVsbGV0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQodGhpcy5haW1UeXBlLCBidWxsZXQuZGlyZWN0aW9uLCBidWxsZXQubmV0SWQsIHRoaXMub3duZXIsICg8QnVsbGV0cy5Ib21pbmdCdWxsZXQ+YnVsbGV0KS50YXJnZXQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KHRoaXMuYWltVHlwZSwgYnVsbGV0LmRpcmVjdGlvbiwgYnVsbGV0Lm5ldElkLCB0aGlzLm93bmVyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWxsZXREaXJlY3Rpb24oX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX21hZ2F6aW5lLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZE1hZ2F6aW5lKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX25ldElkPzogbnVtYmVyKTogQnVsbGV0cy5CdWxsZXRbXSB7XHJcbiAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucHJvamVjdGlsZUFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zdCByZWYgPSBHYW1lLmJ1bGxldHNKU09OLmZpbmQoYnVsbGV0ID0+IGJ1bGxldC50eXBlID09IF9idWxsZXRUeXBlKTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5haW1UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkJ1bGxldChyZWYubmFtZSwgcmVmLnNwZWVkLCByZWYuaGl0UG9pbnRzU2NhbGUsIHJlZi5saWZldGltZSwgcmVmLmtub2NrYmFja0ZvcmNlLCByZWYua2lsbGNvdW50LCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMub3duZXIsIF9uZXRJZCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQUlNLkhPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5Ib21pbmdCdWxsZXQocmVmLm5hbWUsIHJlZi5zcGVlZCwgcmVmLmhpdFBvaW50c1NjYWxlLCByZWYubGlmZXRpbWUsIHJlZi5rbm9ja2JhY2tGb3JjZSwgcmVmLmtpbGxjb3VudCwgX3Bvc2l0aW9uLCBfZGlyZWN0aW9uLCB0aGlzLm93bmVyLCBudWxsLCBfbmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG1hZ2F6aW5lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBBSU0ge1xyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuXHJcbn0iXX0=