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
    Game.viewport.initialize("Viewport", Game.graph, Game.cmpCamera, Game.canvas);
    Game.connected = false;
    Game.currentNetObj = [];
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
        Game.cmpCamera.mtxPivot.translation = Game.ƒ.Vector3.ZERO();
        Game.cmpCamera.mtxPivot.translateZ(25);
        Game.cmpCamera.mtxPivot.rotateY(180);
        if (Networking.client.id == Networking.client.idHost) {
            // Generation.rooms = Generation.generateNormalRooms();
            Items.ItemGenerator.fillPool();
            while (true) {
                Generation.procedualRoomGeneration();
                if (!Generation.generationFailed) {
                    break;
                }
                console.warn("GENERATION FAILED -> RESTART GENERATION");
            }
            Game.serverPredictionAvatar = new Networking.ServerPrediction(null);
        }
        Game.graph.appendChild(Game.avatar1);
        Game.ƒAid.addStandardLightComponents(Game.graph);
    }
    function update() {
        findGameObjects();
        Game.deltaTime = Game.ƒ.Loop.timeFrameGame * 0.001;
        pauseCheck();
        Game.avatar1.predict();
        cameraUpdate();
        if (Networking.client.id == Networking.client.idHost) {
            Networking.updateAvatarPosition(Game.avatar1.mtxLocal.translation, Game.avatar1.mtxLocal.rotation);
            Game.serverPredictionAvatar.update();
        }
        UI.updateUI();
        draw();
    }
    function findGameObjects() {
        Game.items = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ITEM);
        Game.bullets = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.BULLET);
        Game.entities = Game.graph.getChildren().filter(child => child instanceof Entity.Entity);
        Game.enemies = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
        Game.currentRoom = Game.graph.getChildren().find(elem => elem.tag == Tag.TAG.ROOM);
        Game.currentNetObj = setNetObj(Game.graph.getChildren().filter(elem => Networking.isNetworkObject(elem)));
    }
    function setNetObj(_netOj) {
        let tempNetObjs = [];
        _netOj.forEach(obj => {
            tempNetObjs.push({ netId: Networking.getNetId(obj), netObjectNode: obj });
        });
        return tempNetObjs;
    }
    function setClient() {
        if (Networking.client.socket.readyState == Networking.client.socket.OPEN && Networking.client.idRoom.toLowerCase() != "lobby") {
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
            document.getElementById("UI").style.visibility = "visible";
        }
        else {
            setTimeout(() => {
                startLoop();
            }, 100);
        }
    }
    function start() {
        loadTextures();
        // loadJSON();
        //TODO: add sprite to graphe for startscreen
        document.getElementById("Startscreen").style.visibility = "visible";
        document.getElementById("StartGame").addEventListener("click", () => {
            document.getElementById("Startscreen").style.visibility = "hidden";
            Networking.connecting();
            loadJSON();
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
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.REDTICK, new ƒ.Vector2(3, 3), avatar1);
                        // EnemySpawner.spawnMultipleEnemiesAtRoom(5, Game.currentRoom.mtxLocal.translation.toVector2());
                        // EnemySpawner.spawnByID(Enemy.ENEMYCLASS.ENEMYSMASH, Entity.ID.OGER, new ƒ.Vector2(3, 3), null);
                        EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONOR, Entity.ID.SUMMONOR, new Game.ƒ.Vector2(3, 3), null);
                    }
                    //#region init Items
                    if (Networking.client.id == Networking.client.idHost) {
                        // let item2 = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                        // item2.setPosition(new ƒ.Vector2(-5, 0))
                        // // let item3 = new Items.InternalItem(Items.ITEMID.SCALEUP, new ƒ.Vector2(-2, 0), null);
                        // let zipzap = new Items.InternalItem(Items.ITEMID.TEST);
                        // zipzap.setPosition(new ƒ.Vector2(5, 0));
                        // zipzap.spawn();
                        // graph.appendChild(item2);
                        // graph.appendChild(item3);
                    }
                    Networking.spawnPlayer();
                    if (Networking.client.id == Networking.client.idHost) {
                        let roomInfos = [];
                        let coords = Generation.getCoordsFromRooms();
                        for (let i = 0; i < coords.length; i++) {
                            roomInfos.push({ coords: coords[i], roomType: Generation.rooms.find(room => room.coordinates == coords[i]).roomType });
                        }
                        Game.miniMap = new UI.Minimap(roomInfos);
                        Game.graph.addChild(Game.miniMap);
                    }
                    startLoop();
                }
                else {
                    setTimeout(waitOnConnection, 300);
                }
            }
            document.getElementById("Hostscreen").style.visibility = "visible";
            document.getElementById("Host").addEventListener("click", Networking.createRoom);
            document.getElementById("Join").addEventListener("click", () => {
                let roomId = document.getElementById("Room").value;
                Networking.joinRoom(roomId);
            });
            updateRooms();
            waitForLobby();
            function waitForLobby() {
                if (Networking.clients.length > 1 && Networking.client.idRoom.toLocaleLowerCase() != "lobby") {
                    document.getElementById("Hostscreen").style.visibility = "hidden";
                    document.getElementById("RoomId").parentElement.style.visibility = "hidden";
                    document.getElementById("Lobbyscreen").style.visibility = "visible";
                    Game.connected = true;
                }
                else {
                    setTimeout(() => {
                        waitForLobby();
                    }, 200);
                }
            }
            async function updateRooms() {
                if (Networking.client.socket.readyState == Networking.client.socket.OPEN) {
                    Networking.getRooms();
                    return;
                }
                else {
                    setTimeout(() => {
                        updateRooms();
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
            Game.avatar1 = new Player.Ranged(Entity.ID.RANGED, new Entity.Attributes(10000, 5, 5, 1, 2, 5, 1, 80));
        }
        if (_e.target.id == "Melee") {
            Game.avatar1 = new Player.Melee(Entity.ID.MELEE, new Entity.Attributes(10000, 1, 5, 1, 2, 10, 1, 80));
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
        const loadBuffs = await (await fetch("./Resources/BuffStorage.json")).json();
        Game.damageBuffJSON = loadBuffs.damageBuff;
        Game.attributeBuffJSON = loadBuffs.attributeBuff;
        console.warn("all JSON loaded");
    }
    async function loadTextures() {
        await Generation.txtStartRoom.load("./Resources/Image/Rooms/map01.png");
        await Bullets.bulletTxt.load("./Resources/Image/Projectiles/arrow.png");
        await Bullets.waterBallTxt.load("./Resources/Image/Projectiles/waterBall.png");
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
        await UI.immuneParticle.load("./Resources/Image/Particles/immune.png");
        await UI.commonParticle.load("./Resources/Image/Particles/Rarity/common.png");
        await UI.rareParticle.load("./Resources/Image/Particles/Rarity/rare.png");
        await UI.epicParticle.load("./Resources/Image/Particles/Rarity/epic.png");
        await UI.legendaryParticle.load("./Resources/Image/Particles/Rarity/legendary.png");
        await Entity.txtShadow.load("./Resources/Image/Particles/shadow.png");
        //Minimap
        await UI.normalRoom.load("./Resources/Image/Minimap/normal.png");
        await UI.challengeRoom.load("./Resources/Image/Minimap/challenge.png");
        await UI.merchantRoom.load("./Resources/Image/Minimap/merchant.png");
        await UI.treasureRoom.load("./Resources/Image/Minimap/treasure.png");
        await UI.bossRoom.load("./Resources/Image/Minimap/boss.png");
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
        await AnimationGeneration.txtSummonerIdle.load("./Resources/Image/Enemies/summoner/summonerIdle.png");
        await AnimationGeneration.txtSummonerSummon.load("./Resources/Image/Enemies/summoner/summonerSmash.png");
        await AnimationGeneration.txtSummonerTeleport.load("./Resources/Image/Enemies/summoner/summonerTeleport.png");
        //Items
        await Items.txtIceBucket.load("./Resources/Image/Items/iceBucket.png");
        await Items.txtDmgUp.load("./Resources/Image/Items/damageUp.png");
        await Items.txtHealthUp.load("./Resources/Image/Items/healthUp.png");
        await Items.txtSpeedUp.load("./Resources/Image/Items/speedUp.png");
        await Items.txtToxicRelationship.load("./Resources/Image/Items/toxicRelationship.png");
        AnimationGeneration.generateAnimationObjects();
        //TODO: USE THIS
        // console.clear();
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
        Game.miniMap.mtxLocal.translation = new Game.ƒ.Vector3(Game.cmpCamera.mtxPivot.translation.x + Game.miniMap.offsetX, Game.cmpCamera.mtxPivot.translation.y + Game.miniMap.offsetY, 0);
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
        updateInvUI(Game.avatar1.items, player1UI);
        //Avatar2 UI
        if (Game.connected) {
            player2UI.querySelector("#HP").style.width = (Game.avatar2.attributes.healthPoints / Game.avatar2.attributes.maxHealthPoints * 100) + "%";
            //InventoryUI
            updateInvUI(Game.avatar2.items, player2UI);
        }
        function updateInvUI(_inv, _ui) {
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
                    let exsist = false;
                    if (element.imgSrc == undefined) {
                        exsist = true;
                    }
                    else {
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
                        let newDiv = document.createElement("div");
                        newDiv.className = "tooltip";
                        let newItem = document.createElement("img");
                        newItem.src = element.imgSrc;
                        newDiv.appendChild(newItem);
                        let newTooltip = document.createElement("span");
                        newTooltip.textContent = element.description;
                        newTooltip.className = "tooltiptext";
                        newDiv.appendChild(newTooltip);
                        let newTooltipLabel = document.createElement("p");
                        newTooltipLabel.textContent = element.name;
                        newTooltip.insertAdjacentElement("afterbegin", newTooltipLabel);
                        _ui.querySelector("#Inventory").appendChild(newDiv);
                    }
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
        tag = Tag.TAG.UI;
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
            let mtrSolidWhite = new ƒ.Material("SolidWhite", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
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
    UI.immuneParticle = new ƒ.TextureImage();
    UI.commonParticle = new ƒ.TextureImage();
    UI.rareParticle = new ƒ.TextureImage();
    UI.epicParticle = new ƒ.TextureImage();
    UI.legendaryParticle = new ƒ.TextureImage();
    class Particles extends Game.ƒAid.NodeSprite {
        id;
        animationParticles;
        particleframeNumber;
        particleframeRate;
        width;
        height;
        constructor(_id, _texture, _frameCount, _frameRate) {
            super(Buff.BUFFID[_id].toLowerCase());
            this.id = _id;
            this.particleframeNumber = _frameCount;
            this.particleframeRate = _frameRate;
            this.animationParticles = new Game.ƒAid.SpriteSheetAnimation(Buff.BUFFID[_id].toLowerCase(), new ƒ.CoatTextured(ƒ.Color.CSS("white"), _texture));
            this.height = _texture.image.height;
            this.width = _texture.image.width / this.particleframeNumber;
            this.animationParticles.generateByGrid(ƒ.Rectangle.GET(0, 0, this.width, this.height), this.particleframeNumber, 32, ƒ.ORIGIN2D.CENTER, ƒ.Vector2.X(this.width));
            this.setAnimation(this.animationParticles);
            this.framerate = _frameRate;
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translateZ(0.001);
        }
    }
    UI.Particles = Particles;
})(UI || (UI = {}));
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
        TAG[TAG["OBSTICAL"] = 7] = "OBSTICAL";
        TAG[TAG["UI"] = 8] = "UI";
    })(TAG = Tag.TAG || (Tag.TAG = {}));
})(Tag || (Tag = {}));
var Entity;
(function (Entity_1) {
    class Entity extends Game.ƒAid.NodeSprite {
        currentAnimationState;
        performKnockback = false;
        tag;
        netId;
        netObjectNode = this;
        id;
        attributes;
        collider;
        items = [];
        weapon;
        buffs = [];
        offsetColliderX;
        offsetColliderY;
        colliderScaleFaktor;
        canMoveX = true;
        canMoveY = true;
        moveDirection = Game.ƒ.Vector3.ZERO();
        animationContainer;
        idleScale;
        currentKnockback = ƒ.Vector3.ZERO();
        shadow;
        constructor(_id, _netId) {
            super(getNameById(_id));
            this.netId = Networking.IdManager(_netId);
            this.id = _id;
            this.attributes = new Entity_1.Attributes(1, 1, 1, 1, 1, 1, 1, 1);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.addComponent(new ƒ.ComponentTransform());
            this.offsetColliderX = 0;
            this.offsetColliderY = 0;
            this.colliderScaleFaktor = 1;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)), (this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor, this.netId);
            if (AnimationGeneration.getAnimationById(this.id) != null) {
                let ani = AnimationGeneration.getAnimationById(this.id);
                this.animationContainer = ani;
                this.idleScale = ani.scale.find(animation => animation[0] == "idle")[1];
            }
            this.shadow = new Entity_1.Shadow(this);
            // this.addChild(this.shadow);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.updateBuffs();
            this.shadow.updateShadowPos();
            if (Game.connected && Networking.client.idHost == Networking.client.id) {
                this.setCollider();
            }
        }
        updateScale() {
            this.attributes.updateScaleDependencies();
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.collider.setRadius((this.cmpTransform.mtxLocal.scaling.x / 2) * this.colliderScaleFaktor);
        }
        setCollider() {
            this.collider.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + (this.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (this.offsetColliderY * this.mtxLocal.scaling.y)));
        }
        updateBuffs() {
            if (this.buffs.length == 0) {
                return;
            }
            for (let i = 0; i < this.buffs.length; i++) {
                this.buffs[i].doBuffStuff(this);
            }
        }
        collide(_direction) {
            this.canMoveX = true;
            this.canMoveY = true;
            let walls = Game.currentRoom.walls;
            let wallColliders = [];
            walls.forEach(elem => {
                wallColliders.push(elem.collider);
            });
            let mewDirection = _direction.clone;
            if (!mewDirection.equals(Game.ƒ.Vector3.ZERO())) {
                mewDirection.normalize();
                mewDirection.scale((Game.deltaTime * this.attributes.speed));
            }
            this.calculateCollision(wallColliders, mewDirection);
        }
        calculateCollision(_collider, _direction) {
            _collider.forEach((element) => {
                if (element instanceof Collider.Collider) {
                    if (this.collider.collides(element)) {
                        let intersection = this.collider.getIntersection(element);
                        let areaBeforeMove = intersection;
                        if (areaBeforeMove < this.collider.getRadius + element.getRadius) {
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
        /**
         * does Damage to the Entity
         * @param _value value how much damage is applied
         */
        getDamage(_value) {
            if (Networking.client.idHost == Networking.client.id) {
                if (_value != null && this.attributes.hitable) {
                    let hitValue = this.getDamageReduction(_value);
                    this.attributes.healthPoints -= hitValue;
                    Game.graph.addChild(new UI.DamageUI(this.mtxLocal.translation, Math.round(hitValue)));
                    Networking.updateUI(this.mtxLocal.translation.toVector2(), Math.round(hitValue));
                    Networking.updateEntityAttributes({ value: this.attributes.healthPoints, type: Entity_1.ATTRIBUTETYPE.HEALTHPOINTS }, this.netId);
                }
                if (this.attributes.healthPoints <= 0) {
                    Networking.removeEntity(this.netId);
                    this.die();
                }
            }
        }
        die() {
            Networking.popID(this.netId);
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
                direction.scale(_knockbackForce * knockBackScaling);
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
                        case ANIMATIONSTATES.TELEPORT:
                            this.setAnimation(this.animationContainer.animations[name]);
                            this.currentAnimationState = ANIMATIONSTATES.TELEPORT;
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
        ANIMATIONSTATES[ANIMATIONSTATES["TELEPORT"] = 4] = "TELEPORT";
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
        ID[ID["RANGED"] = 0] = "RANGED";
        ID[ID["MELEE"] = 1] = "MELEE";
        ID[ID["MERCHANT"] = 2] = "MERCHANT";
        ID[ID["BAT"] = 3] = "BAT";
        ID[ID["REDTICK"] = 4] = "REDTICK";
        ID[ID["SMALLTICK"] = 5] = "SMALLTICK";
        ID[ID["SKELETON"] = 6] = "SKELETON";
        ID[ID["OGER"] = 7] = "OGER";
        ID[ID["SUMMONOR"] = 8] = "SUMMONOR";
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
        flocking;
        isAggressive;
        constructor(_id, _position, _netId) {
            super(_id, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.isAggressive = false;
            let ref = Game.enemiesJSON.find(enemy => enemy.name == Entity.ID[_id].toLowerCase());
            console.log(ref);
            this.attributes = new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, ref.attributes.knockbackForce, ref.attributes.armor, ref.attributes.coolDownReduction, ref.attributes.accuracy);
            this.setAnimation(this.animationContainer.animations["idle"]);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(_position.x, _position.y, 0.1);
            this.mtxLocal.scaling = new ƒ.Vector3(this.attributes.scale, this.attributes.scale, this.attributes.scale);
            this.offsetColliderX = ref.offsetColliderX;
            this.offsetColliderY = ref.offsetColliderY;
            this.colliderScaleFaktor = ref.colliderScaleFaktor;
            this.collider = new Collider.Collider(new ƒ.Vector2(this.mtxLocal.translation.x + (ref.offsetColliderX * this.mtxLocal.scaling.x), this.mtxLocal.translation.y + (ref.offsetColliderY * this.mtxLocal.scaling.y)), ((this.mtxLocal.scaling.x * this.idleScale) / 2) * this.colliderScaleFaktor, this.netId);
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
        getDamage(_value) {
            super.getDamage(_value);
            this.isAggressive = true;
        }
        doKnockback(_body) {
            // (<Player.Player>_body).getKnockback(this.attributes.knockbackForce, this.cmpTransform.mtxLocal.translation);
        }
        getKnockback(_knockbackForce, _position) {
            super.getKnockback(_knockbackForce, _position);
        }
        move(_direction) {
            // this.moveDirection.add(_direction);
            if (this.isAggressive) {
                this.collide(_direction);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
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
            super.die();
            Game.currentRoom.enemyCountManager.onEnemyDeath();
        }
        collide(_direction) {
            let knockback = this.currentKnockback.clone;
            if (knockback.magnitude > 0) {
                // console.log("direction: " + knockback.magnitude);
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
                this.calculateCollision(avatarColliders, _direction);
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
                    // console.log("knockback: " + knockback.magnitude);
                    // console.log("direction: " + _direction.magnitude);
                }
            }
            this.reduceKnockback();
        }
    }
    Enemy_1.Enemy = Enemy;
    class EnemyDumb extends Enemy {
        flocking = new Enemy_1.FlockingBehaviour(this, 2, 2, 0.1, 1, 1, 1, 0, 1);
        aggressiveDistance = 3 * 3;
        stamina = new Ability.Cooldown(180);
        recover = new Ability.Cooldown(60);
        constructor(_id, _pos, _netId) {
            super(_id, _pos, _netId);
            //TODO: talk with tobi
            this.stamina.onEndCoolDown = () => this.recoverStam;
        }
        behaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            //TODO: set to 3 after testing
            if (distance < this.aggressiveDistance) {
                this.isAggressive = true;
            }
            if (this.isAggressive && !this.recover.hasCoolDown) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
        }
        recoverStam = () => {
            this.recover.startCoolDown();
            this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
        };
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    this.moveDirection = ƒ.Vector3.ZERO();
                    break;
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.stamina.hasCoolDown && !this.recover.hasCoolDown) {
                        this.stamina.startCoolDown();
                    }
                    if (this.stamina.hasCoolDown) {
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                        //TODO: set a callback function to do this.
                        // if (this.stamina.getCurrentCooldown == 1) {
                        //     this.recover.startCoolDown();
                        //     this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
                        // }
                    }
                    break;
            }
        }
    }
    Enemy_1.EnemyDumb = EnemyDumb;
    class EnemySmash extends Enemy {
        coolDown = new Ability.Cooldown(5);
        avatars = [];
        randomPlayer = Math.round(Math.random());
        currentBehaviour = Entity.BEHAVIOUR.IDLE;
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (this.currentBehaviour == Entity.BEHAVIOUR.ATTACK && this.getCurrentFrame >= this.animationContainer.animations["attack"].frames.length - 1) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (distance < 4 && !this.coolDown.hasCoolDown) {
                this.coolDown.startCoolDown();
                this.currentBehaviour = Entity.BEHAVIOUR.ATTACK;
            }
            if (this.coolDown.hasCoolDown && this.currentBehaviour != Entity.BEHAVIOUR.IDLE) {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
            if (this.currentBehaviour != Entity.BEHAVIOUR.FOLLOW) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
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
        dash = new Ability.Dash(this.netId, 12, 1, 5 * 60, 3);
        lastMoveDireciton;
        dashCount = 1;
        avatars = [];
        randomPlayer = Math.round(Math.random());
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);
        }
        behaviour() {
            this.avatars = [Game.avatar1, Game.avatar2];
            this.target = this.avatars[this.randomPlayer].mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitudeSquared;
            this.flocking.update();
            if (!this.dash.hasCooldown()) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            if (Math.random() * 100 < 0.1) {
                this.dash.doAbility();
            }
            if (this.moveDirection.magnitudeSquared > 0.0005) {
                this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
            }
            else {
                this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    if (!this.dash.doesAbility) {
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
                        this.lastMoveDireciton = this.moveDirection;
                    }
                    break;
                case Entity.BEHAVIOUR.IDLE:
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
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.weapon = new Weapons.Weapon(60, 1, Bullets.BULLETTYPE.STANDARD, 2, this.netId, Weapons.AIM.NORMAL);
        }
        behaviour() {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(this.target.toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            if (distance < 5) {
                this.currentBehaviour = Entity.BEHAVIOUR.FLEE;
                this.isAggressive = true;
            }
            else if (distance < 9 && this.isAggressive) {
                this.currentBehaviour = Entity.BEHAVIOUR.FOLLOW;
            }
            else {
                this.currentBehaviour = Entity.BEHAVIOUR.IDLE;
            }
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveSimple(this.target).toVector3();
                    break;
                case Entity.BEHAVIOUR.IDLE:
                    this.moveDirection = ƒ.Vector3.ZERO();
                    this.shoot();
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.moveDirection = this.moveAway(this.target).toVector3();
                    break;
            }
        }
        shoot(_netId) {
            this.target = Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2();
            let _direction = ƒ.Vector3.DIFFERENCE(this.target.toVector3(0), this.mtxLocal.translation);
            if (_direction.magnitude < 3 || this.isAggressive) {
                this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, true);
            }
        }
    }
    Enemy_1.EnemyShoot = EnemyShoot;
    class SummonorAdds extends EnemyDash {
        avatar;
        randomPlayer = Math.round(Math.random());
        constructor(_id, _position, _target, _netId) {
            super(_id, _position, _netId);
            this.avatar = _target;
            this.flocking = new Enemy_1.FlockingBehaviour(this, 3, 0.8, 1.5, 1, 1, 0.1, 0);
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
            this.flocking.update();
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.FOLLOW:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    if (!this.dash.doesAbility) {
                        this.lastMoveDireciton = this.moveDirection;
                        this.moveDirection = this.flocking.getMoveVector().toVector3();
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
        ITEMID[ITEMID["THORSHAMMER"] = 12] = "THORSHAMMER";
        ITEMID[ITEMID["GETSTRONKO"] = 13] = "GETSTRONKO";
        ITEMID[ITEMID["GETWEAKO"] = 14] = "GETWEAKO";
        ITEMID[ITEMID["ZIPZAP"] = 15] = "ZIPZAP";
        ITEMID[ITEMID["TEST"] = 16] = "TEST";
    })(ITEMID = Items.ITEMID || (Items.ITEMID = {}));
    Items.txtIceBucket = new ƒ.TextureImage();
    Items.txtDmgUp = new ƒ.TextureImage();
    Items.txtHealthUp = new ƒ.TextureImage();
    Items.txtToxicRelationship = new ƒ.TextureImage();
    Items.txtSpeedUp = new ƒ.TextureImage();
    class Item extends Game.ƒ.Node {
        tag = Tag.TAG.ITEM;
        id;
        rarity;
        netId;
        description;
        imgSrc;
        collider;
        transform = new ƒ.ComponentTransform();
        position;
        get getPosition() { return this.position; }
        buff = [];
        changedValue;
        constructor(_id, _netId) {
            super(ITEMID[_id]);
            this.id = _id;
            this.netId = Networking.IdManager(_netId);
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad()));
            let material = new ƒ.Material("white", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
            this.addComponent(new ƒ.ComponentMaterial(material));
            this.addComponent(new ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.cmpTransform.mtxLocal.scaling.x / 2, this.netId);
            this.buff.push(this.getBuffById());
            this.setTextureById();
        }
        clone() {
            return null;
        }
        addRarityBuff() {
            let buff = new Buff.RarityBuff(this.rarity);
            buff.addToItem(this);
        }
        getBuffById() {
            let temp = getBuffItemById(this.id);
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    return Buff.getBuffById(Buff.BUFFID.POISON);
                case ITEMID.VAMPY:
                    return Buff.getBuffById(Buff.BUFFID.BLEEDING);
                case ITEMID.SLOWYSLOW:
                    return Buff.getBuffById(Buff.BUFFID.SLOW);
                case ITEMID.GETSTRONKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEUP);
                case ITEMID.GETWEAKO:
                    return Buff.getBuffById(Buff.BUFFID.SCALEDOWN);
                default:
                    return null;
            }
        }
        loadTexture(_texture) {
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
                    this.loadTexture(Items.txtDmgUp);
                    break;
                case ITEMID.SPEEDUP:
                    this.loadTexture(Items.txtSpeedUp);
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
                    //TODO: add correct texture and change in JSON
                    break;
                case ITEMID.THORSHAMMER:
                    //TODO: add correct texture and change in JSON
                    break;
            }
        }
        setPosition(_position) {
            this.position = _position;
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.collider.setPosition(_position);
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnItem(this.id, this.position, this.netId);
        }
        despawn() {
            Networking.popID(this.netId);
            Networking.removeItem(this.netId);
            Game.graph.removeChild(this);
        }
        addItemToEntity(_avatar) {
            _avatar.items.push(this);
        }
        removeItemToEntity(_avatar) {
        }
    }
    Items.Item = Item;
    class InternalItem extends Item {
        value;
        choosenOneNetId;
        constructor(_id, _netId) {
            super(_id, _netId);
            const item = getInternalItemById(this.id);
            if (item != undefined) {
                this.name = item.name;
                this.value = item.value;
                this.description = item.description;
                this.imgSrc = item.imgSrc;
                this.rarity = item.rarity;
            }
            this.addRarityBuff();
        }
        setChoosenOneNetId(_netId) {
            this.choosenOneNetId = _netId;
        }
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
            this.setAttributesById(_avatar, true);
            this.despawn();
        }
        removeItemToEntity(_avatar) {
            this.setAttributesById(_avatar, false);
            _avatar.items.splice(_avatar.items.indexOf(_avatar.items.find(item => item.id == this.id)), 1);
        }
        clone() {
            return new InternalItem(this.id);
        }
        setAttributesById(_avatar, _add) {
            switch (this.id) {
                case ITEMID.ICEBUCKETCHALLENGE:
                    if (_add) {
                        this.changedValue = _avatar.attributes.coolDownReduction - Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                        _avatar.attributes.coolDownReduction = Calculation.subPercentageAmountToValue(_avatar.attributes.coolDownReduction, this.value);
                    }
                    else {
                        _avatar.attributes.coolDownReduction += this.changedValue;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.coolDownReduction, type: Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION }, _avatar.netId);
                    break;
                case ITEMID.DMGUP:
                    if (_add) {
                        _avatar.attributes.attackPoints += this.value;
                    }
                    else {
                        _avatar.attributes.attackPoints -= this.value;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.attackPoints, type: Entity.ATTRIBUTETYPE.ATTACKPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SPEEDUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value) - _avatar.attributes.speed;
                        _avatar.attributes.speed = Calculation.addPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    }
                    else {
                        _avatar.attributes.speed -= this.changedValue;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.speed, type: Entity.ATTRIBUTETYPE.SPEED }, _avatar.netId);
                    break;
                case ITEMID.PROJECTILESUP:
                    if (_add) {
                        _avatar.weapon.projectileAmount += this.value;
                    }
                    else {
                        _avatar.weapon.projectileAmount -= this.value;
                    }
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.HEALTHUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value) - _avatar.attributes.maxHealthPoints;
                        let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                        _avatar.attributes.maxHealthPoints = Calculation.addPercentageAmountToValue(_avatar.attributes.maxHealthPoints, this.value);
                        let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                        _avatar.attributes.healthPoints += amount;
                    }
                    else {
                        _avatar.attributes.maxHealthPoints -= this.changedValue;
                        let currentMaxPoints = _avatar.attributes.maxHealthPoints;
                        let amount = _avatar.attributes.maxHealthPoints - currentMaxPoints;
                        _avatar.attributes.healthPoints -= amount;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.healthPoints, type: Entity.ATTRIBUTETYPE.HEALTHPOINTS }, _avatar.netId);
                    Networking.updateEntityAttributes({ value: _avatar.attributes.maxHealthPoints, type: Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS }, _avatar.netId);
                    break;
                case ITEMID.SCALEUP:
                    if (_add) {
                        this.changedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.changedValue;
                    }
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.SCALEDOWN:
                    if (_add) {
                        this.changedValue = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.changedValue;
                    }
                    _avatar.updateScale();
                    Networking.updateEntityAttributes({ value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE }, _avatar.netId);
                    break;
                case ITEMID.ARMORUP:
                    if (_add) {
                        _avatar.attributes.armor += this.value;
                    }
                    else {
                        _avatar.attributes.armor -= this.value;
                    }
                    Networking.updateEntityAttributes({ value: _avatar.attributes.armor, type: Entity.ATTRIBUTETYPE.ARMOR }, _avatar.netId);
                    break;
                case ITEMID.HOMECOMING:
                    if (_avatar instanceof Player.Ranged) {
                        if (_add) {
                            _avatar.weapon.aimType = Weapons.AIM.HOMING;
                        }
                        else {
                            _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                        }
                        Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    }
                    break;
                case ITEMID.THORSHAMMER:
                    localStorage.setItem("cooldownTime", _avatar.weapon.getCoolDown.getMaxCoolDown.toString());
                    localStorage.setItem("aimType", Weapons.AIM[_avatar.weapon.aimType]);
                    localStorage.setItem("bulletType", Bullets.BULLETTYPE[_avatar.weapon.bulletType]);
                    localStorage.setItem("projectileAmount", _avatar.weapon.projectileAmount.toString());
                    _avatar.weapon.getCoolDown.setMaxCoolDown = 100 * 60;
                    _avatar.weapon.aimType = Weapons.AIM.NORMAL;
                    _avatar.weapon.bulletType = Bullets.BULLETTYPE.THORSHAMMER;
                    _avatar.weapon.projectileAmount = 1;
                    _avatar.weapon.canShoot = true;
                    Networking.updateAvatarWeapon(_avatar.weapon, _avatar.netId);
                    break;
                case ITEMID.ZIPZAP:
                    if (_add) {
                        let newItem = new Bullets.ZipZapObject(_avatar.netId, null);
                        newItem.spawn();
                    }
                    else {
                        let zipzap = Game.graph.getChildren().find(item => item.type == Bullets.BULLETTYPE.ZIPZAP);
                        zipzap.despawn();
                    }
                    break;
                case ITEMID.TEST:
                    if (_add) {
                        new Ability.AreaOfEffect(Ability.AOETYPE.HEALTHUP, null).addToEntity(_avatar);
                    }
                    else {
                        _avatar.getChildren().find(child => child.id == Ability.AOETYPE.HEALTHUP).despawn();
                    }
            }
        }
    }
    Items.InternalItem = InternalItem;
    class BuffItem extends Item {
        value;
        tickRate;
        duration;
        constructor(_id, _netId) {
            super(_id, _netId);
            let temp = getBuffItemById(this.id);
            this.name = temp.name;
            this.value = temp.value;
            this.tickRate = temp.tickRate;
            this.duration = temp.duration;
            this.imgSrc = temp.imgSrc;
            this.rarity = temp.rarity;
            this.addRarityBuff();
        }
        addItemToEntity(_avatar) {
            super.addItemToEntity(_avatar);
            this.setBuffById(_avatar);
            this.despawn();
        }
        clone() {
            return new BuffItem(this.id);
        }
        setBuffById(_avatar) {
            switch (this.id) {
                case ITEMID.TOXICRELATIONSHIP:
                    let newBuff = this.buff.find(buff => buff.id == Buff.BUFFID.POISON).clone();
                    newBuff.duration = undefined;
                    newBuff.value = 0.5;
                    newBuff.addToEntity(_avatar);
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
    class ItemGenerator {
        static itemPool = [];
        static fillPool() {
            Game.internalItemJSON.forEach(item => {
                this.itemPool.push(new Items.InternalItem(item.id));
            });
            Game.buffItemJSON.forEach(item => {
                this.itemPool.push(new BuffItem(item.id));
            });
        }
        static getRandomItem() {
            let possibleItems = [];
            possibleItems = this.getPossibleItems();
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            // this.itemPool.splice(this.itemPool.indexOf(returnItem));
            return returnItem.clone();
        }
        static getRandomItemByRarity(_rarity) {
            let possibleItems = this.itemPool.filter(item => item.rarity == _rarity);
            let randomIndex = Math.round(Math.random() * (possibleItems.length - 1));
            let returnItem = possibleItems[randomIndex];
            return returnItem.clone();
        }
        static getPossibleItems() {
            let chosenRarity = this.getRarity();
            switch (chosenRarity) {
                case RARITY.COMMON:
                    return this.itemPool.filter(item => item.rarity == RARITY.COMMON);
                case RARITY.RARE:
                    return this.itemPool.filter(item => item.rarity == RARITY.RARE);
                case RARITY.EPIC:
                    return this.itemPool.filter(item => item.rarity == RARITY.EPIC);
                case RARITY.LEGENDARY:
                    return this.itemPool.filter(item => item.rarity == RARITY.LEGENDARY);
                default:
                    return this.itemPool.filter(item => item.rarity = RARITY.COMMON);
            }
        }
        static getRarity() {
            let rarityNumber = Math.round(Math.random() * 100);
            if (rarityNumber >= 50) {
                return RARITY.COMMON;
            }
            if (rarityNumber >= 20 && rarityNumber < 50) {
                return RARITY.RARE;
            }
            if (rarityNumber >= 5 && rarityNumber < 20) {
                return RARITY.EPIC;
            }
            if (rarityNumber < 5) {
                return RARITY.LEGENDARY;
            }
            return RARITY.COMMON;
        }
    }
    Items.ItemGenerator = ItemGenerator;
    let RARITY;
    (function (RARITY) {
        RARITY[RARITY["COMMON"] = 0] = "COMMON";
        RARITY[RARITY["RARE"] = 1] = "RARE";
        RARITY[RARITY["EPIC"] = 2] = "EPIC";
        RARITY[RARITY["LEGENDARY"] = 3] = "LEGENDARY";
    })(RARITY = Items.RARITY || (Items.RARITY = {}));
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
    AnimationGeneration.txtSummonerIdle = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerSummon = new ƒ.TextureImage();
    AnimationGeneration.txtSummonerTeleport = new ƒ.TextureImage();
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
                    break;
                case Entity.ID.OGER:
                    this.addAnimation(ogerIdle.generatedSpriteAnimation, ogerIdle.animationScale, ogerIdle.frameRate);
                    this.addAnimation(ogerWalk.generatedSpriteAnimation, ogerWalk.animationScale, ogerWalk.frameRate);
                    this.addAnimation(ogerAttack.generatedSpriteAnimation, ogerAttack.animationScale, ogerAttack.frameRate);
                    break;
                case Entity.ID.SUMMONOR:
                    this.addAnimation(summonerIdle.generatedSpriteAnimation, summonerIdle.animationScale, summonerIdle.frameRate);
                    this.addAnimation(summonerWalk.generatedSpriteAnimation, summonerWalk.animationScale, summonerWalk.frameRate);
                    this.addAnimation(summonerSummon.generatedSpriteAnimation, summonerSummon.animationScale, summonerSummon.frameRate);
                    this.addAnimation(summonerTeleport.generatedSpriteAnimation, summonerTeleport.animationScale, summonerTeleport.frameRate);
                    break;
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
        constructor(_id, _animationName, _texture, _amountOfFrames, _frameRate) {
            this.id = _id;
            this.animationName = _animationName;
            this.spriteSheet = _texture;
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
    let summonerIdle;
    let summonerWalk;
    let summonerSummon;
    let summonerTeleport;
    //#endregion
    //#region AnimationContainer
    let batAnimation;
    let redTickAnimation;
    let smallTickAnimation;
    let skeletonAnimation;
    let ogerAnimation;
    let summonerAnimation;
    //#endregion
    function generateAnimationObjects() {
        batIdle = new MyAnimationClass(Entity.ID.BAT, "idle", AnimationGeneration.txtBatIdle, 4, 12);
        redTickIdle = new MyAnimationClass(Entity.ID.REDTICK, "idle", AnimationGeneration.txtRedTickIdle, 6, 12);
        redTickWalk = new MyAnimationClass(Entity.ID.REDTICK, "walk", AnimationGeneration.txtRedTickWalk, 4, 16);
        smallTickIdle = new MyAnimationClass(Entity.ID.SMALLTICK, "idle", AnimationGeneration.txtSmallTickIdle, 6, 12);
        smallTickWalk = new MyAnimationClass(Entity.ID.SMALLTICK, "walk", AnimationGeneration.txtSmallTickWalk, 4, 12);
        skeletonIdle = new MyAnimationClass(Entity.ID.SKELETON, "idle", AnimationGeneration.txtSkeletonIdle, 5, 12);
        skeletonWalk = new MyAnimationClass(Entity.ID.SKELETON, "walk", AnimationGeneration.txtSkeletonWalk, 7, 12);
        ogerIdle = new MyAnimationClass(Entity.ID.OGER, "idle", AnimationGeneration.txtOgerIdle, 5, 6);
        ogerWalk = new MyAnimationClass(Entity.ID.OGER, "walk", AnimationGeneration.txtOgerWalk, 6, 6);
        ogerAttack = new MyAnimationClass(Entity.ID.OGER, "attack", AnimationGeneration.txtOgerAttack, 10, 12);
        summonerIdle = new MyAnimationClass(Entity.ID.SUMMONOR, "idle", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerWalk = new MyAnimationClass(Entity.ID.SUMMONOR, "walk", AnimationGeneration.txtSummonerIdle, 6, 12);
        summonerSummon = new MyAnimationClass(Entity.ID.SUMMONOR, "summon", AnimationGeneration.txtSummonerSummon, 13, 12);
        summonerTeleport = new MyAnimationClass(Entity.ID.SUMMONOR, "teleport", AnimationGeneration.txtSummonerTeleport, 6, 12);
        batAnimation = new AnimationContainer(Entity.ID.BAT);
        redTickAnimation = new AnimationContainer(Entity.ID.REDTICK);
        smallTickAnimation = new AnimationContainer(Entity.ID.SMALLTICK);
        skeletonAnimation = new AnimationContainer(Entity.ID.SKELETON);
        ogerAnimation = new AnimationContainer(Entity.ID.OGER);
        summonerAnimation = new AnimationContainer(Entity.ID.SUMMONOR);
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
            case Entity.ID.SUMMONOR:
                return summonerAnimation;
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
        get owner() { return Game.currentNetObj.find(elem => elem.netId == this.ownerNetId).netObjectNode; }
        ;
        stateBuffer;
        constructor(_ownerNetId) {
            this.minTimeBetweenTicks = 1 / this.gameTickRate;
            this.stateBuffer = new Array(this.bufferSize);
            this.ownerNetId = _ownerNetId;
        }
        handleTick() {
        }
        processMovement(_input) {
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
        AsyncTolerance = 0.2;
        constructor(_ownerNetId) {
            super(_ownerNetId);
            this.inputBuffer = new Array(this.bufferSize);
        }
        update() {
            try {
                this.flyDirection = this.owner.flyDirection;
            }
            catch (error) {
                console.log("cant find owner");
            }
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
            // console.log(inputPayload.tick + "___" + inputPayload.inputVector);
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
            this.abilityCount = _abilityCount;
            this.currentabilityCount = this.abilityCount;
            this.duration = new Cooldown(_duration);
            this.cooldown = new Cooldown(_cooldownTime);
        }
        eventUpdate = (_event) => {
            this.updateAbility();
        };
        updateAbility() {
            if (this.doesAbility && !this.duration.hasCoolDown) {
                this.deactivateAbility();
                this.doesAbility = false;
            }
        }
        doAbility() {
            //do stuff
            if (!this.cooldown.hasCoolDown && this.currentabilityCount <= 0) {
                this.currentabilityCount = this.abilityCount;
            }
            if (!this.cooldown.hasCoolDown && this.currentabilityCount > 0) {
                this.doesAbility = true;
                this.activateAbility();
                this.duration.startCoolDown();
                this.currentabilityCount--;
                if (this.currentabilityCount <= 0) {
                    this.cooldown.startCoolDown();
                }
            }
        }
        hasCooldown() {
            return this.cooldown.hasCoolDown;
        }
        activateAbility() {
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        deactivateAbility() {
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
    }
    Ability_1.Ability = Ability;
    class Block extends Ability {
        activateAbility() {
            super.activateAbility();
            this.owner.attributes.hitable = false;
        }
        deactivateAbility() {
            super.deactivateAbility();
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
            super.activateAbility();
            console.log("activate");
            this.owner.attributes.hitable = false;
            this.owner.attributes.speed *= this.speed;
        }
        deactivateAbility() {
            super.deactivateAbility();
            console.log("deactivate");
            this.owner.attributes.hitable = true;
            this.owner.attributes.speed /= this.speed;
        }
    }
    Ability_1.Dash = Dash;
    class SpawnSummoners extends Ability {
        spawnRadius = 1;
        activateAbility() {
            super.activateAbility();
            if (Networking.client.id == Networking.client.idHost) {
                let position = new ƒ.Vector2(this.owner.mtxLocal.translation.x + Math.random() * this.spawnRadius, this.owner.mtxLocal.translation.y + 2);
                if (Math.round(Math.random()) > 0.5) {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar1, null);
                }
                else {
                    EnemySpawner.spawnByID(Enemy.ENEMYCLASS.SUMMONORADDS, Entity.ID.BAT, position, Game.avatar2, null);
                }
            }
        }
    }
    Ability_1.SpawnSummoners = SpawnSummoners;
    class circleShoot extends Ability {
        bulletAmount;
        bullets = [];
        activateAbility() {
            super.activateAbility();
            this.bullets = [];
            for (let i = 0; i < this.bulletAmount; i++) {
                this.bullets.push(new Bullets.Bullet(Bullets.BULLETTYPE.STANDARD, this.owner.mtxLocal.translation.toVector2(), Game.ƒ.Vector3.ZERO(), this.ownerNetId));
                this.bullets[i].mtxLocal.rotateZ((360 / this.bulletAmount * i));
            }
            for (let i = 0; i < this.bulletAmount; i++) {
                Game.graph.addChild(this.bullets[i]);
                Networking.spawnBullet(Weapons.AIM.NORMAL, this.bullets[i].direction, this.bullets[i].netId, this.ownerNetId);
            }
        }
    }
    Ability_1.circleShoot = circleShoot;
    class Cooldown {
        hasCoolDown;
        coolDown;
        get getMaxCoolDown() { return this.coolDown; }
        ;
        set setMaxCoolDown(_param) { this.hasCoolDown = false; this.coolDown = _param; this.currentCooldown = this.coolDown; }
        currentCooldown;
        get getCurrentCooldown() { return this.currentCooldown; }
        ;
        onEndCoolDown;
        constructor(_number) {
            this.coolDown = _number;
            this.currentCooldown = _number;
            this.hasCoolDown = false;
        }
        startCoolDown() {
            this.hasCoolDown = true;
            Game.ƒ.Loop.addEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        endCoolDown() {
            if (this.onEndCoolDown != undefined) {
                this.onEndCoolDown();
            }
            this.hasCoolDown = false;
            Game.ƒ.Loop.removeEventListener("loopFrame" /* LOOP_FRAME */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.updateCoolDown();
        };
        updateCoolDown() {
            if (this.hasCoolDown && this.currentCooldown > 0) {
                this.currentCooldown--;
            }
            if (this.currentCooldown <= 0 && this.hasCoolDown) {
                this.endCoolDown();
                this.currentCooldown = this.coolDown;
            }
        }
    }
    Ability_1.Cooldown = Cooldown;
})(Ability || (Ability = {}));
var Ability;
(function (Ability) {
    let AOETYPE;
    (function (AOETYPE) {
        AOETYPE[AOETYPE["HEALTHUP"] = 0] = "HEALTHUP";
    })(AOETYPE = Ability.AOETYPE || (Ability.AOETYPE = {}));
    class AreaOfEffect extends Game.ƒ.Node {
        netId;
        id;
        position;
        get getPosition() { return this.position; }
        ;
        set setPosition(_pos) { this.position = _pos; }
        ;
        collider;
        get getCollider() { return this.collider; }
        ;
        duration;
        areaMat;
        ownerNetId;
        buffList;
        get getBuffList() { return this.buffList; }
        ;
        damageValue;
        constructor(_id, _netId) {
            super(AOETYPE[_id].toLowerCase());
            Networking.IdManager(_netId);
            this.duration = new Ability.Cooldown(120);
            this.duration.onEndCoolDown = this.despawn;
            this.addComponent(new Game.ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.damageValue = 1;
            this.areaMat = new ƒ.Material("aoeShader", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), UI.commonParticle));
            let cmpMat = new Game.ƒ.ComponentMaterial(this.areaMat);
            this.addComponent(cmpMat);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), 2, this.netId);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(this.collider.getRadius * 2, this.collider.getRadius * 2, 1);
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.collider.position = this.mtxWorld.translation.toVector2();
            this.collisionDetection();
        }
        despawn = () => {
            console.log("despawn");
            //TODO: find right parent to cancel;
            Game.graph.removeChild(this);
            Networking.popID(this.netId);
        };
        spawn(_entity) {
            _entity.addChild(this);
            this.mtxLocal.translateZ(0.01);
            if (this.duration == undefined) {
                return;
            }
            else {
                this.duration.startCoolDown();
            }
        }
        addToEntity(_entity) {
            this.spawn(_entity);
            this.ownerNetId = _entity.netId;
        }
        collisionDetection() {
            let colliders = [];
            colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY || element.tag == Tag.TAG.PLAYER);
            colliders.forEach(_coll => {
                let entity = _coll;
                if (this.collider.collides(entity.collider) && entity.attributes != undefined) {
                    //TODO: overwrite in other children to do own thing
                    this.applyAreaOfEffect(entity);
                }
            });
        }
        applyAreaOfEffect(_entity) {
            //TODO: overwrite in other classes
            if (this.ownerNetId != _entity.netId) {
                console.log("colliding with: " + _entity.name);
                Buff.getBuffById(Buff.BUFFID.POISON).addToEntity(_entity);
            }
        }
    }
    Ability.AreaOfEffect = AreaOfEffect;
})(Ability || (Ability = {}));
var Entity;
(function (Entity) {
    let ATTRIBUTETYPE;
    (function (ATTRIBUTETYPE) {
        ATTRIBUTETYPE[ATTRIBUTETYPE["HEALTHPOINTS"] = 0] = "HEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["MAXHEALTHPOINTS"] = 1] = "MAXHEALTHPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["KNOCKBACKFORCE"] = 2] = "KNOCKBACKFORCE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["HITABLE"] = 3] = "HITABLE";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ARMOR"] = 4] = "ARMOR";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SPEED"] = 5] = "SPEED";
        ATTRIBUTETYPE[ATTRIBUTETYPE["ATTACKPOINTS"] = 6] = "ATTACKPOINTS";
        ATTRIBUTETYPE[ATTRIBUTETYPE["COOLDOWNREDUCTION"] = 7] = "COOLDOWNREDUCTION";
        ATTRIBUTETYPE[ATTRIBUTETYPE["SCALE"] = 8] = "SCALE";
    })(ATTRIBUTETYPE = Entity.ATTRIBUTETYPE || (Entity.ATTRIBUTETYPE = {}));
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
        accuracy = 80;
        constructor(_healthPoints, _attackPoints, _speed, _scale, _knockbackForce, _armor, _cooldownReduction, _accuracy) {
            this.scale = _scale;
            this.armor = _armor;
            this.healthPoints = _healthPoints;
            this.maxHealthPoints = this.healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
            this.knockbackForce = _knockbackForce;
            this.coolDownReduction = _cooldownReduction;
            this.accuracy = _accuracy;
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
    class BigBoom extends Enemy.EnemyDumb {
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        behaviour() {
        }
        moveBehaviour() {
            this.behaviour();
            switch (this.currentBehaviour) {
                case Entity.BEHAVIOUR.IDLE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                    break;
                default:
                    // this.setAnimation(<ƒAid.SpriteSheetAnimation>this.animations["idle"]);
                    break;
            }
        }
    }
    Enemy.BigBoom = BigBoom;
    class Summonor extends Enemy.EnemyShoot {
        damageTaken = 0;
        attackPhaseCd = new Ability.Cooldown(580);
        defencePhaseCd = new Ability.Cooldown(720);
        beginShooting = false;
        shootingCount = 3;
        currentShootingCount = 0;
        summonPosition = new ƒ.Vector3();
        summon = new Ability.SpawnSummoners(this.netId, 0, 1, 45);
        dash = new Ability.Dash(this.netId, 45, 1, 13 * 60, 5);
        shoot360 = new Ability.circleShoot(this.netId, 0, 3, 5 * 60);
        dashWeapon = new Weapons.Weapon(12, 1, Bullets.BULLETTYPE.SUMMONER, 1, this.netId, Weapons.AIM.NORMAL);
        flock = new Enemy.FlockingBehaviour(this, 4, 4, 0, 0, 1, 1, 1, 2);
        constructor(_id, _position, _netId) {
            super(_id, _position, _netId);
            this.tag = Tag.TAG.ENEMY;
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
            this.defencePhaseCd.onEndCoolDown = this.stopDefencePhase;
        }
        behaviour() {
            this.target = Game.avatar1.mtxLocal.translation.toVector2();
            let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
            this.flock.update();
            this.moveDirection = this.flock.getMoveVector().toVector3();
            if (distance < 5) {
                this.isAggressive = true;
                this.flock.avoidWeight = 5;
                //TODO: Intro animation here and when it is done then fight...
            }
            else {
                this.flock.avoidWeight = 0;
            }
            if (this.damageTaken >= 25) {
                new Buff.AttributesBuff(Buff.BUFFID.IMMUNE, null, 1, 0).addToEntity(this);
                // new Buff.DamageBuff(Buff.BUFFID.POISON, 120, 30, 3).addToEntity(this);
                this.currentBehaviour = Entity.BEHAVIOUR.SUMMON;
            }
            else {
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
                    this.switchAnimation(Entity.ANIMATIONSTATES.IDLE);
                    break;
                case Entity.BEHAVIOUR.FLEE:
                    this.switchAnimation(Entity.ANIMATIONSTATES.WALK);
                    this.attackingPhase();
                    break;
                case Entity.BEHAVIOUR.SUMMON:
                    this.defencePhase();
                    break;
                default:
                    break;
            }
        }
        attackingPhase() {
            if (!this.attackPhaseCd.hasCoolDown) {
                this.attackPhaseCd.setMaxCoolDown = Math.round(this.attackPhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                this.attackPhaseCd.startCoolDown();
            }
            if (this.attackPhaseCd.hasCoolDown) {
                let distance = ƒ.Vector3.DIFFERENCE(Calculation.getCloserAvatarPosition(this.mtxLocal.translation).toVector2().toVector3(), this.cmpTransform.mtxLocal.translation).magnitude;
                if (distance > 10 || this.dash.doesAbility) {
                    this.moveDirection = Calculation.getRotatedVectorByAngle2D(this.moveDirection, 90);
                    if (Math.round(Math.random() * 100) >= 10) {
                        this.dash.doAbility();
                    }
                }
                else {
                    // this.moveDirection = this.moveAway(Calculation.getCloserAvatarPosition(this.cmpTransform.mtxLocal.translation).toVector2()).toVector3();
                }
                if (this.dash.doesAbility) {
                    this.dashWeapon.shoot(this.mtxLocal.translation.toVector2(), Game.ƒ.Vector2.DIFFERENCE(this.target, this.mtxLocal.translation.toVector2()).toVector3(), null, true);
                    this.dashWeapon.getCoolDown.setMaxCoolDown = Calculation.clampNumber(Math.random() * 30, 8, 30);
                }
            }
            else {
                this.mtxLocal.translation = (new ƒ.Vector2(0, 0)).toVector3();
                this.shooting360();
            }
        }
        defencePhase() {
            this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y - (Game.currentRoom.roomSize / 3), this.mtxWorld.translation.z);
            if (this.teleport()) {
                this.switchAnimation(Entity.ANIMATIONSTATES.SUMMON);
                if (!this.defencePhaseCd.hasCoolDown) {
                    this.defencePhaseCd.setMaxCoolDown = Math.round(this.defencePhaseCd.getMaxCoolDown + Math.random() * 5 + Math.random() * -5);
                    this.defencePhaseCd.startCoolDown();
                }
                else {
                    if (this.mtxLocal.translation.equals(this.summonPosition, 1)) {
                        console.log("spawning");
                        this.moveDirection = ƒ.Vector3.ZERO();
                        this.summon.doAbility();
                    }
                }
            }
        }
        stopDefencePhase = () => {
            this.damageTaken = 0;
            this.summonPosition.set(Game.currentRoom.mtxWorld.translation.x, Game.currentRoom.mtxWorld.translation.y, this.mtxWorld.translation.z);
            if (this.teleport()) {
                this.shooting360();
                this.damageTaken = 0;
            }
        };
        teleport() {
            if (!this.mtxLocal.translation.equals(this.summonPosition)) {
                this.switchAnimation(Entity.ANIMATIONSTATES.TELEPORT);
                if (this.getCurrentFrame >= 5) {
                    this.mtxLocal.translation = this.summonPosition;
                    return true;
                }
            }
            else {
                return true;
            }
            return false;
        }
        shooting360() {
            if (!this.beginShooting) {
                this.currentShootingCount = Math.round(this.shootingCount + Math.random() * 2);
                this.beginShooting = true;
            }
            else {
                if (this.currentShootingCount > 0) {
                    this.shoot360.bulletAmount = Math.round(8 + Math.random() * 8);
                    this.shoot360.doAbility();
                    if (this.shoot360.doesAbility) {
                        this.currentShootingCount--;
                    }
                }
                else {
                    this.beginShooting = false;
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
        BUFFID[BUFFID["IMMUNE"] = 4] = "IMMUNE";
        BUFFID[BUFFID["SCALEUP"] = 5] = "SCALEUP";
        BUFFID[BUFFID["SCALEDOWN"] = 6] = "SCALEDOWN";
    })(BUFFID = Buff_1.BUFFID || (Buff_1.BUFFID = {}));
    class Buff {
        duration;
        tickRate;
        id;
        noDuration;
        coolDown;
        constructor(_id, _duration, _tickRate) {
            this.id = _id;
            this.duration = _duration;
            this.tickRate = _tickRate;
            this.noDuration = 0;
            if (_duration != undefined) {
                this.coolDown = new Ability.Cooldown(_duration);
            }
            else {
                this.coolDown = undefined;
            }
        }
        getParticleById(_id) {
            switch (_id) {
                case BUFFID.POISON:
                    return new UI.Particles(BUFFID.POISON, UI.poisonParticle, 6, 12);
                case BUFFID.IMMUNE:
                    return new UI.Particles(BUFFID.IMMUNE, UI.immuneParticle, 1, 6);
                default:
                    return null;
            }
        }
        clone() {
            return this;
        }
        applyBuff(_avatar) {
            if (Networking.client.id == Networking.client.idHost) {
                this.getBuffStatsById(this.id, _avatar, true);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * removes the buff from the buff list, removes the particle and sends the new list to the client
         * @param _avatar entity the buff should be removed
         */
        removeBuff(_avatar) {
            _avatar.removeChild(_avatar.getChildren().find(child => child.id == this.id));
            _avatar.buffs.splice(_avatar.buffs.indexOf(this));
            if (Networking.client.idHost == Networking.client.id) {
                this.getBuffStatsById(this.id, _avatar, false);
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * only use this function to add buffs to entities
         * @param _avatar entity it should be add to
         * @returns
         */
        addToEntity(_avatar) {
            if (_avatar.buffs.filter(buff => buff.id == this.id).length > 0) {
                return;
            }
            else {
                _avatar.buffs.push(this);
                this.addParticle(_avatar);
                if (this.coolDown != undefined) {
                    this.coolDown.startCoolDown();
                }
                Networking.updateBuffList(_avatar.buffs, _avatar.netId);
            }
        }
        /**
         * buff applies its buff stats to the entity and deletes itself when its duration is over
         * @param _avatar entity it should be add to
         */
        doBuffStuff(_avatar) {
        }
        getBuffStatsById(_id, _avatar, _add) {
        }
        addParticle(_avatar) {
            if (_avatar.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _avatar.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_avatar.mtxLocal.scaling.x, _avatar.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translation = new ƒ.Vector2(_avatar.offsetColliderX, _avatar.offsetColliderY).toVector3(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.Buff = Buff;
    class RarityBuff {
        id;
        constructor(_id) {
            this.id = _id;
        }
        addToItem(_item) {
            this.addParticleToItem(_item);
        }
        getParticleById(_id) {
            switch (_id) {
                case Items.RARITY.COMMON:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
                case Items.RARITY.RARE:
                    return new UI.Particles(_id, UI.rareParticle, 1, 12);
                case Items.RARITY.EPIC:
                    return new UI.Particles(_id, UI.epicParticle, 1, 12);
                case Items.RARITY.LEGENDARY:
                    return new UI.Particles(_id, UI.legendaryParticle, 1, 12);
                default:
                    return new UI.Particles(_id, UI.commonParticle, 1, 12);
            }
        }
        addParticleToItem(_item) {
            if (_item.getChildren().find(child => child.id == this.id) == undefined) {
                let particle = this.getParticleById(this.id);
                if (particle != undefined) {
                    _item.addChild(particle);
                    particle.mtxLocal.scale(new ƒ.Vector3(_item.mtxLocal.scaling.x, _item.mtxLocal.scaling.y, 1));
                    particle.mtxLocal.translateZ(0.1);
                    particle.activate(true);
                }
            }
        }
    }
    Buff_1.RarityBuff = RarityBuff;
    /**
     * creates a new Buff that does Damage to an Entity;
     */
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
            if (this.coolDown != undefined) {
                if (!this.coolDown.hasCoolDown) {
                    this.removeBuff(_avatar);
                    return;
                }
                else if (this.coolDown.getCurrentCooldown % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
            }
            else {
                if (this.noDuration % this.tickRate == 0) {
                    this.applyBuff(_avatar);
                }
                this.noDuration++;
            }
        }
        getBuffStatsById(_id, _avatar, _add) {
            if (_add) {
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
            else {
                return;
            }
        }
    }
    Buff_1.DamageBuff = DamageBuff;
    /**
     * creates a new Buff that changes an attribute of an Entity for the duration of the buff
     */
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
                }
                else if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.duration--;
            }
            else {
                if (!this.isBuffApplied) {
                    this.applyBuff(_avatar);
                    this.isBuffApplied = true;
                }
                this.addParticle(_avatar);
            }
        }
        getBuffStatsById(_id, _avatar, _add) {
            let payload;
            switch (_id) {
                case BUFFID.SLOW:
                    if (_add) {
                        this.removedValue = _avatar.attributes.speed - Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                        _avatar.attributes.speed -= Calculation.subPercentageAmountToValue(_avatar.attributes.speed, this.value);
                    }
                    else {
                        _avatar.attributes.speed += this.removedValue;
                    }
                    break;
                case BUFFID.IMMUNE:
                    if (_add) {
                        _avatar.attributes.hitable = false;
                    }
                    else {
                        _avatar.attributes.hitable = true;
                    }
                    payload = { value: _avatar.attributes.hitable, type: Entity.ATTRIBUTETYPE.HITABLE };
                    break;
                case BUFFID.SCALEUP:
                    if (_add) {
                        this.removedValue = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value) - _avatar.attributes.scale;
                        _avatar.attributes.scale = Calculation.addPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale -= this.removedValue;
                    }
                    _avatar.updateScale();
                    payload = { value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE };
                    break;
                case BUFFID.SCALEDOWN:
                    if (_add) {
                        this.removedValue = _avatar.attributes.scale - Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                        _avatar.attributes.scale = Calculation.subPercentageAmountToValue(_avatar.attributes.scale, this.value);
                    }
                    else {
                        _avatar.attributes.scale += this.removedValue;
                    }
                    _avatar.updateScale();
                    payload = { value: _avatar.attributes.scale, type: Entity.ATTRIBUTETYPE.SCALE };
                    break;
            }
            Networking.updateEntityAttributes(payload, _avatar.netId);
        }
    }
    Buff_1.AttributesBuff = AttributesBuff;
    function getBuffById(_id) {
        let ref = undefined;
        ref = Game.damageBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new DamageBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        ref = Game.attributeBuffJSON.find(buff => buff.id == _id);
        if (ref != undefined) {
            return new AttributesBuff(_id, ref.duration, ref.tickRate, ref.value);
        }
        return null;
    }
    Buff_1.getBuffById = getBuffById;
})(Buff || (Buff = {}));
var Bullets;
(function (Bullets) {
    let BULLETTYPE;
    (function (BULLETTYPE) {
        BULLETTYPE[BULLETTYPE["STANDARD"] = 0] = "STANDARD";
        BULLETTYPE[BULLETTYPE["HIGHSPEED"] = 1] = "HIGHSPEED";
        BULLETTYPE[BULLETTYPE["SLOW"] = 2] = "SLOW";
        BULLETTYPE[BULLETTYPE["MELEE"] = 3] = "MELEE";
        BULLETTYPE[BULLETTYPE["SUMMONER"] = 4] = "SUMMONER";
        BULLETTYPE[BULLETTYPE["THORSHAMMER"] = 5] = "THORSHAMMER";
        BULLETTYPE[BULLETTYPE["ZIPZAP"] = 6] = "ZIPZAP";
    })(BULLETTYPE = Bullets.BULLETTYPE || (Bullets.BULLETTYPE = {}));
    Bullets.bulletTxt = new ƒ.TextureImage();
    Bullets.waterBallTxt = new ƒ.TextureImage();
    class Bullet extends Game.ƒ.Node {
        tag = Tag.TAG.BULLET;
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
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
        texturePath;
        lastPosition;
        countCheckUpdate = 0;
        despawn() {
            if (this.lifetime >= 0 && this.lifetime != null) {
                this.lifetime--;
                if (this.lifetime < 0) {
                    Networking.popID(this.netId);
                    Networking.removeBullet(this.netId);
                    Game.graph.removeChild(this);
                    if (this.type == BULLETTYPE.THORSHAMMER) {
                        this.spawnThorsHammer();
                    }
                }
            }
        }
        constructor(_bulletType, _position, _direction, _ownerNetId, _netId) {
            super(BULLETTYPE[_bulletType]);
            this.type = _bulletType;
            this.netId = Networking.IdManager(_netId);
            let ref = Game.bulletsJSON.find(bullet => bullet.name == BULLETTYPE[_bulletType].toLowerCase());
            this.speed = ref.speed;
            this.hitPointsScale = ref.hitPointsScale;
            this.lifetime = ref.lifetime;
            this.knockbackForce = ref.knockbackForce;
            this.killcount = ref.killcount;
            this.texturePath = ref.texturePath;
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
            this.ownerNetId = _ownerNetId;
            this.serverPrediction = new Networking.ServerBulletPrediction(this.netId);
            this.clientPrediction = new Networking.ClientBulletPrediction(this.netId);
            this.lastPosition = this.mtxLocal.translation;
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.predict();
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id) {
                if (this.owner == Game.avatar1) {
                    this.clientPrediction.update();
                }
                else {
                    this.checkUpdate();
                }
            }
            else {
                if (this.owner == Game.avatar2) {
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
        checkUpdate() {
            if (this.lastPosition == this.mtxLocal.translation) {
                this.countCheckUpdate++;
                if (this.countCheckUpdate >= (2 * 60)) {
                    this.lifetime = 0;
                    this.despawn();
                }
            }
            else {
                this.countCheckUpdate = 0;
            }
            this.lastPosition = this.mtxLocal.translation;
        }
        move(_direction) {
            _direction.normalize();
            if (Networking.client.idHost == Networking.client.id && this.owner == Game.avatar2) {
                _direction.scale(this.clientPrediction.minTimeBetweenTicks * this.speed);
            }
            else {
                _direction.scale(Game.deltaTime * this.speed);
            }
            this.cmpTransform.mtxLocal.translate(_direction);
            this.offsetCollider();
            this.collisionDetection();
        }
        updateRotation(_direction) {
            this.mtxLocal.rotateZ(Calculation.calcDegree(this.cmpTransform.mtxLocal.translation, ƒ.Vector3.SUM(_direction, this.cmpTransform.mtxLocal.translation)) + 90);
        }
        spawnThorsHammer() {
            if (Networking.client.id == Networking.client.idHost) {
                let removeItem = this.owner.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
                Networking.updateInventory(false, removeItem.id, removeItem.netId, this.ownerNetId);
                this.owner.items.splice(this.owner.items.indexOf(removeItem), 1);
                let item = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
                item.setPosition(this.mtxWorld.translation.toVector2());
                if (this.owner == Game.avatar1) {
                    item.setChoosenOneNetId(Game.avatar2.netId);
                }
                else {
                    item.setChoosenOneNetId(Game.avatar1.netId);
                }
                item.spawn();
                this.owner.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                this.owner.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                this.owner.weapon.bulletType = BULLETTYPE[localStorage.getItem("bulletType")];
                this.owner.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                this.owner.weapon.canShoot = false;
                Networking.updateAvatarWeapon(this.owner.weapon, this.ownerNetId);
            }
        }
        loadTexture() {
            if (this.texturePath != "" && this.texturePath != null) {
                let newTxt = new ƒ.TextureImage();
                let newCoat = new ƒ.CoatRemissiveTextured();
                let newMtr = new ƒ.Material("mtr", ƒ.ShaderFlatTextured, newCoat);
                let oldComCoat = new ƒ.ComponentMaterial();
                oldComCoat = this.getComponent(ƒ.ComponentMaterial);
                switch (this.texturePath) {
                    case Bullets.bulletTxt.url:
                        newTxt = Bullets.bulletTxt;
                        break;
                    case Bullets.waterBallTxt.url:
                        newTxt = Bullets.waterBallTxt;
                        break;
                    default:
                        break;
                }
                newCoat.color = ƒ.Color.CSS("WHITE");
                newCoat.texture = newTxt;
                oldComCoat.material = newMtr;
            }
        }
        setBuffToTarget(_target) {
            this.owner.items.forEach(item => {
                item.buff.forEach(buff => {
                    if (buff != undefined) {
                        buff.clone().addToEntity(_target);
                    }
                });
            });
        }
        offsetCollider() {
            let newPosition = new ƒ.Vector2(this.cmpTransform.mtxLocal.translation.x + this.cmpTransform.mtxLocal.scaling.x / 2, this.cmpTransform.mtxLocal.translation.y);
            this.collider.position = newPosition;
        }
        collisionDetection() {
            let colliders = [];
            if (this.owner.tag == Tag.TAG.PLAYER) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.ENEMY);
            }
            colliders.forEach((_elem) => {
                let element = _elem;
                if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                    if (element.attributes.healthPoints > 0) {
                        if (element instanceof Enemy.SummonorAdds) {
                            if (element.avatar == this.owner) {
                                this.killcount--;
                                return;
                            }
                        }
                        element.getDamage(this.owner.attributes.attackPoints * this.hitPointsScale);
                        this.setBuffToTarget(element);
                        element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                        this.killcount--;
                    }
                }
            });
            if (this.owner.tag == Tag.TAG.ENEMY) {
                colliders = Game.graph.getChildren().filter(element => element.tag == Tag.TAG.PLAYER);
                colliders.forEach((_elem) => {
                    let element = _elem;
                    if (this.collider.collides(element.collider) && element.attributes != undefined && this.killcount > 0) {
                        if (element.attributes.healthPoints > 0 && element.attributes.hitable) {
                            element.getDamage(this.hitPointsScale);
                            element.getKnockback(this.knockbackForce, this.mtxLocal.translation);
                            Game.graph.addChild(new UI.DamageUI(element.cmpTransform.mtxLocal.translation, this.hitPointsScale));
                            this.killcount--;
                        }
                    }
                });
            }
            if (this.killcount <= 0) {
                this.lifetime = 0;
            }
            colliders = [];
            colliders = Game.graph.getChildren().find(element => element.tag == Tag.TAG.ROOM).walls;
            colliders.forEach((_elem) => {
                let element = _elem;
                if (element.collider != undefined && this.collider.collidesRect(element.collider)) {
                    this.lifetime = 0;
                }
            });
        }
    }
    Bullets.Bullet = Bullet;
    class HomingBullet extends Bullet {
        target;
        rotateSpeed = 2;
        targetDirection;
        constructor(_bullettype, _position, _direction, _ownerId, _target, _netId) {
            super(_bullettype, _position, _direction, _ownerId, _netId);
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
        move(_direction) {
            super.move(_direction);
            if (Networking.client.id == Networking.client.idHost) {
                this.calculateHoming();
            }
            else {
                if (this.owner == Game.avatar1) {
                    this.calculateHoming();
                }
            }
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
    class ZipZapObject extends Bullet {
        nextTarget;
        avatars;
        playerSize;
        counter;
        tickHit;
        constructor(_ownerNetId, _netId) {
            super(BULLETTYPE.ZIPZAP, new ƒ.Vector2(0, 0), new ƒ.Vector2(0, 0).toVector3(), _ownerNetId, _netId);
            this.avatars = undefined;
            this.counter = 0;
            this.tag = Tag.TAG.UI;
            this.tickHit = new Ability.Cooldown(12);
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, this.netId);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            if (Networking.client.idHost == Networking.client.id) {
                if (Game.avatar1 != undefined && Game.avatar2 != undefined) {
                    if (this.avatars == undefined) {
                        this.avatars = [Game.avatar1, Game.avatar2];
                        this.playerSize = this.avatars.length;
                        this.nextTarget = this.avatars[0 % this.playerSize].mtxLocal.translation.toVector2();
                        this.mtxLocal.translation = this.nextTarget.toVector3();
                    }
                    this.avatars = [Game.avatar1, Game.avatar2];
                    this.move();
                    this.collider.position = this.mtxLocal.translation.toVector2();
                    if (!this.tickHit.hasCoolDown) {
                        this.collisionDetection();
                        this.tickHit.startCoolDown();
                    }
                    Networking.updateBullet(this.mtxLocal.translation, this.mtxLocal.rotation, this.netId);
                    this.killcount = 50;
                }
            }
        }
        spawn() {
            Game.graph.addChild(this);
            Networking.spawnZipZap(this.ownerNetId, this.netId);
        }
        despawn() {
            Game.graph.removeChild(this);
            Networking.removeBullet(this.netId);
        }
        move() {
            let direction = Game.ƒ.Vector2.DIFFERENCE(this.nextTarget, this.mtxLocal.translation.toVector2());
            let distance = direction.magnitudeSquared;
            if (direction.magnitudeSquared > 0) {
                direction.normalize();
            }
            direction.scale(Game.deltaTime * this.speed);
            this.mtxLocal.translate(direction.toVector3());
            if (distance < 1) {
                this.counter = (this.counter + 1) % this.playerSize;
            }
            this.nextTarget = this.avatars[this.counter].mtxLocal.translation.toVector2();
        }
    }
    Bullets.ZipZapObject = ZipZapObject;
})(Bullets || (Bullets = {}));
var Collider;
(function (Collider_1) {
    class Collider {
        ownerNetId;
        radius;
        get getRadius() { return this.radius; }
        ;
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
        setPosition(_position) {
            this.position = _position;
        }
        setRadius(_newRadius) {
            this.radius = _newRadius;
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
    function spawnMultipleEnemiesAtRoom(_maxEnemies, _roomPos) {
        if (Networking.client.idHost == Networking.client.id) {
            //TODO: depending on currentroom.enemyCount and decrease it 
            let spawnedEnemies = 0;
            while (spawnedEnemies < _maxEnemies) {
                if (currentTime == spawnTime) {
                    let position = new ƒ.Vector2(((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))), ((Math.random() * Game.currentRoom.roomSize / 2) - ((Math.random() * Game.currentRoom.roomSize / 2))));
                    position.add(_roomPos);
                    //TODO: use ID to get random enemies
                    spawnByID(Enemy.ENEMYCLASS.ENEMYDUMB, Entity.ID.SMALLTICK, position);
                    spawnedEnemies++;
                }
                currentTime--;
                if (currentTime <= 0) {
                    currentTime = spawnTime;
                }
            }
        }
    }
    EnemySpawner.spawnMultipleEnemiesAtRoom = spawnMultipleEnemiesAtRoom;
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
    function spawnByID(_enemyClass, _id, _position, _target, _netID) {
        let enemy;
        switch (_enemyClass) {
            case Enemy.ENEMYCLASS.ENEMYDASH:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDash(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDash(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYDUMB:
                if (_netID == null) {
                    enemy = new Enemy.EnemyDumb(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.ENEMYPATROL:
                if (_netID == null) {
                    enemy = new Enemy.EnemyPatrol(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyPatrol(_id, _position, _netID);
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
                    enemy = new Enemy.EnemySmash(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemySmash(_id, _position, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONORADDS:
                if (_netID == null) {
                    enemy = new Enemy.SummonorAdds(_id, _position, _target, _netID);
                }
                else {
                    enemy = new Enemy.SummonorAdds(_id, _position, _target, _netID);
                }
                break;
            case Enemy.ENEMYCLASS.SUMMONOR:
                if (_netID == null) {
                    enemy = new Enemy.Summonor(_id, _position, _netID);
                }
                else {
                    enemy = new Enemy.Summonor(_id, _position, _netID);
                }
                break;
            default:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
            Networking.spawnEnemy(_enemyClass, enemy, enemy.netId);
        }
    }
    EnemySpawner.spawnByID = spawnByID;
    function networkSpawnById(_enemyClass, _id, _position, _netID, _target) {
        if (_target != null) {
            if (Game.avatar1.netId == _target) {
                spawnByID(_enemyClass, _id, _position, Game.avatar1, _netID);
            }
            else {
                spawnByID(_enemyClass, _id, _position, Game.avatar2, _netID);
            }
        }
        else {
            spawnByID(_enemyClass, _id, _position, null, _netID);
        }
    }
    EnemySpawner.networkSpawnById = networkSpawnById;
})(EnemySpawner || (EnemySpawner = {}));
var Enemy;
(function (Enemy) {
    class FlockingBehaviour {
        currentNeighbours;
        sightRadius;
        avoidRadius;
        enemies = [];
        pos;
        myEnemy;
        cohesionWeight;
        allignWeight;
        avoidWeight;
        toTargetWeight;
        notToTargetWeight;
        obsticalAvoidWeight = 1.5;
        obsticalCollider;
        constructor(_enemy, _sightRadius, _avoidRadius, _cohesionWeight, _allignWeight, _avoidWeight, _toTargetWeight, _notToTargetWeight, _obsticalAvoidWeight) {
            this.pos = _enemy.mtxLocal.translation.toVector2();
            this.myEnemy = _enemy;
            this.sightRadius = _sightRadius;
            this.avoidRadius = _avoidRadius;
            this.cohesionWeight = _cohesionWeight;
            this.allignWeight = _allignWeight;
            this.avoidWeight = _avoidWeight;
            this.toTargetWeight = _toTargetWeight;
            this.notToTargetWeight = _notToTargetWeight;
            if (_obsticalAvoidWeight != null) {
                this.obsticalAvoidWeight = _obsticalAvoidWeight;
            }
            this.obsticalCollider = new Collider.Collider(this.pos, this.myEnemy.collider.getRadius * 1.75, this.myEnemy.netId);
        }
        update() {
            this.enemies = Game.enemies;
            this.pos = this.myEnemy.mtxLocal.translation.toVector2();
            this.obsticalCollider.position = this.pos;
            this.findNeighbours();
        }
        findNeighbours() {
            this.currentNeighbours = [];
            this.enemies.forEach(enem => {
                if (this.myEnemy.netId != enem.netId) {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.sightRadius) {
                        this.currentNeighbours.push(enem);
                    }
                }
            });
        }
        calculateCohesionMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let cohesionMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    cohesionMove = Game.ƒ.Vector2.SUM(cohesionMove, enem.mtxLocal.translation.toVector2());
                });
                cohesionMove.scale(1 / this.currentNeighbours.length);
                cohesionMove.subtract(this.pos);
                cohesionMove = Calculation.getRotatedVectorByAngle2D(this.myEnemy.moveDirection, Calculation.calcDegree(this.myEnemy.mtxLocal.translation, cohesionMove.toVector3()) / 10).toVector2();
                return cohesionMove;
            }
        }
        calculateAllignmentMove() {
            if (this.currentNeighbours.length <= 0) {
                return this.myEnemy.moveDirection.toVector2();
            }
            else {
                let allignmentMove = ƒ.Vector2.ZERO();
                this.currentNeighbours.forEach(enem => {
                    allignmentMove = Game.ƒ.Vector2.SUM(allignmentMove, enem.moveDirection.toVector2());
                });
                allignmentMove.scale(1 / this.currentNeighbours.length);
                return allignmentMove;
            }
        }
        calculateAvoidanceMove() {
            if (this.currentNeighbours.length <= 0) {
                return ƒ.Vector2.ZERO();
            }
            else {
                let avoidanceMove = ƒ.Vector2.ZERO();
                let nAvoid = 0;
                this.currentNeighbours.forEach(enem => {
                    if (enem.mtxLocal.translation.getDistance(this.pos.toVector3()) < this.avoidRadius) {
                        nAvoid++;
                        avoidanceMove = Game.ƒ.Vector2.SUM(avoidanceMove, Game.ƒ.Vector2.DIFFERENCE(this.pos, enem.mtxLocal.translation.toVector2()));
                    }
                });
                if (nAvoid > 0) {
                    avoidanceMove.scale(1 / nAvoid);
                }
                return avoidanceMove;
            }
        }
        calculateObsticalAvoidanceMove() {
            let obsticals = [];
            Game.currentRoom.walls.forEach(elem => {
                obsticals.push(elem);
            });
            Game.currentRoom.obsticals.forEach(elem => {
                obsticals.push(elem);
            });
            let returnVector = Game.ƒ.Vector2.ZERO();
            let nAvoid = 0;
            obsticals.forEach(obstical => {
                if (obstical.collider instanceof Game.ƒ.Rectangle && this.obsticalCollider.collidesRect(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    move.normalize();
                    let intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                    let areaBeforeMove = intersection.width * intersection.height;
                    this.obsticalCollider.position.add(new Game.ƒ.Vector2(move.x, 0));
                    if (this.obsticalCollider.collidesRect(obstical.collider)) {
                        intersection = this.obsticalCollider.getIntersectionRect(obstical.collider);
                        let afterBeforeMove = intersection.width * intersection.height;
                        if (areaBeforeMove <= afterBeforeMove) {
                            returnVector.add(new Game.ƒ.Vector2(0, move.y));
                        }
                        else {
                            returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                        }
                    }
                    else {
                        returnVector.add(new Game.ƒ.Vector2(move.x, 0));
                    }
                    this.obsticalCollider.position.subtract(new Game.ƒ.Vector2(move.x, 0));
                    nAvoid++;
                }
                if (obstical.collider instanceof Collider.Collider && this.obsticalCollider.collides(obstical.collider)) {
                    let move = Game.ƒ.Vector2.DIFFERENCE(this.pos, obstical.mtxLocal.translation.toVector2());
                    let localAway = Game.ƒ.Vector2.SUM(move, this.myEnemy.mtxLocal.translation.toVector2());
                    let distancePos = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), 135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    let distanceNeg = (Game.ƒ.Vector2.DIFFERENCE(this.myEnemy.target, Game.ƒ.Vector2.SUM(Calculation.getRotatedVectorByAngle2D(localAway.clone.toVector3(), -135).toVector2(), this.myEnemy.mtxLocal.translation.toVector2())));
                    if (distanceNeg.magnitudeSquared > distancePos.magnitudeSquared) {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), 135).toVector2());
                    }
                    else {
                        move.add(Calculation.getRotatedVectorByAngle2D(move.clone.toVector3(), -135).toVector2());
                    }
                    returnVector.add(move);
                    nAvoid++;
                }
            });
            if (nAvoid > 0) {
                returnVector.scale(1 / nAvoid);
            }
            return returnVector;
        }
        getMoveVector() {
            let cohesion = Game.ƒ.Vector2.ZERO();
            let avoid = Game.ƒ.Vector2.ZERO();
            let allign = Game.ƒ.Vector2.ZERO();
            let obsticalAvoid = Game.ƒ.Vector2.ZERO();
            let target = this.myEnemy.moveSimple(this.myEnemy.target);
            if (target.magnitudeSquared > this.toTargetWeight * this.toTargetWeight) {
                target.normalize;
                target.scale(this.toTargetWeight);
            }
            let notToTarget = this.myEnemy.moveAway(this.myEnemy.target);
            if (notToTarget.magnitudeSquared > this.notToTargetWeight * this.notToTargetWeight) {
                notToTarget.normalize;
                notToTarget.scale(this.notToTargetWeight);
            }
            cohesion = this.calculateCohesionMove();
            if (cohesion.magnitudeSquared > this.cohesionWeight * this.cohesionWeight) {
                cohesion.normalize;
                cohesion.scale(this.cohesionWeight);
            }
            avoid = this.calculateAvoidanceMove();
            if (avoid.magnitudeSquared > this.avoidWeight * this.avoidWeight) {
                avoid.normalize;
                avoid.scale(this.avoidWeight);
            }
            allign = this.calculateAllignmentMove();
            if (allign.magnitudeSquared > this.allignWeight * this.allignWeight) {
                allign.normalize;
                allign.scale(this.allignWeight);
            }
            obsticalAvoid = this.calculateObsticalAvoidanceMove();
            if (obsticalAvoid.magnitudeSquared > this.obsticalAvoidWeight * this.obsticalAvoidWeight) {
                obsticalAvoid.normalize;
                obsticalAvoid.scale(this.obsticalAvoidWeight);
            }
            let move = Game.ƒ.Vector2.SUM(notToTarget, target, cohesion, avoid, allign, obsticalAvoid);
            return move;
        }
    }
    Enemy.FlockingBehaviour = FlockingBehaviour;
})(Enemy || (Enemy = {}));
var Entity;
(function (Entity) {
    class Merchant extends Entity.Entity {
        constructor(_id, _netId) {
            super(_id, _netId);
        }
    }
    Entity.Merchant = Merchant;
})(Entity || (Entity = {}));
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
    function clampNumber(_number, _min, _max) {
        return Math.max(_min, Math.min(_number, _max));
    }
    Calculation.clampNumber = clampNumber;
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
            if (_e.code.toUpperCase() == "KEYE") {
                Game.avatar1.openDoor();
            }
            if (_e.code.toUpperCase() != "SPACE") {
                let key = _e.code.toUpperCase().substring(3);
                controller.set(key, true);
            }
            if (_e.code.toUpperCase() == "SPACE") {
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
var UI;
(function (UI) {
    class Minimap extends Game.ƒ.Node {
        tag = Tag.TAG.UI;
        minmapInfo;
        roomMinimapsize = 0.8;
        miniRooms = [];
        offsetX = 11;
        offsetY = 6;
        currentRoom;
        pointer;
        constructor(_minimapInfo) {
            super("Minimap");
            this.minmapInfo = _minimapInfo;
            this.pointer = new Game.ƒ.Node("pointer");
            this.pointer.addComponent(new ƒ.ComponentMesh(new Game.ƒ.MeshQuad));
            this.pointer.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("challengeRoomMat", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")))));
            this.pointer.addComponent(new ƒ.ComponentTransform());
            this.pointer.mtxLocal.scale(Game.ƒ.Vector3.ONE(this.roomMinimapsize / 2));
            this.pointer.mtxLocal.translateZ(10);
            this.addChild(this.pointer);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.scale(new Game.ƒ.Vector3(this.roomMinimapsize, this.roomMinimapsize, this.roomMinimapsize));
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
            this.createMiniRooms();
            this.setCurrentRoom(Game.currentRoom);
            if (Networking.client.id == Networking.client.idHost) {
                Networking.spawnMinimap(this.minmapInfo);
            }
        }
        createMiniRooms() {
            this.minmapInfo.forEach(element => {
                this.miniRooms.push(new MiniRoom(element.coords, element.roomType));
            });
            this.miniRooms.forEach(room => {
                this.addChild(room);
            });
        }
        eventUpdate = (_event) => {
            this.update();
        };
        setCurrentRoom(_room) {
            this.miniRooms.find(room => room.coordinates.equals(_room.coordinates)).isDiscovered();
            if (this.currentRoom != undefined) {
                let subX = this.currentRoom.coordinates.x - _room.coordinates.x;
                let subY = this.currentRoom.coordinates.y - _room.coordinates.y;
                this.offsetX += subX * this.roomMinimapsize;
                this.offsetY += subY * this.roomMinimapsize;
            }
            this.currentRoom = _room;
        }
        update() {
            if (this.currentRoom != undefined) {
                if (this.currentRoom != Game.currentRoom) {
                    this.setCurrentRoom(Game.currentRoom);
                }
                this.pointer.mtxLocal.translation = this.miniRooms.find(room => room.coordinates.equals(Game.currentRoom.coordinates)).mtxLocal.translation;
            }
        }
    }
    UI.Minimap = Minimap;
    UI.normalRoom = new ƒ.TextureImage();
    ;
    UI.challengeRoom = new ƒ.TextureImage();
    ;
    UI.merchantRoom = new ƒ.TextureImage();
    ;
    UI.treasureRoom = new ƒ.TextureImage();
    ;
    UI.bossRoom = new ƒ.TextureImage();
    ;
    class MiniRoom extends Game.ƒ.Node {
        discovered;
        coordinates;
        roomType;
        opacity = 0.75;
        roomMat;
        mesh = new ƒ.MeshQuad;
        constructor(_coordinates, _roomType) {
            super("MinimapRoom");
            this.coordinates = _coordinates;
            this.roomType = _roomType;
            this.discovered = false;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial;
            switch (this.roomType) {
                case Generation.ROOMTYPE.START:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.NORMAL:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.normalRoom));
                    break;
                case Generation.ROOMTYPE.MERCHANT:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.merchantRoom));
                    break;
                case Generation.ROOMTYPE.TREASURE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.treasureRoom));
                    break;
                case Generation.ROOMTYPE.CHALLENGE:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.challengeRoom));
                    break;
                case Generation.ROOMTYPE.BOSS:
                    this.roomMat = new ƒ.Material("roomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white", this.opacity), UI.bossRoom));
                    break;
            }
            cmpMaterial = new ƒ.ComponentMaterial(this.roomMat);
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxLocal.translation = new ƒ.Vector3(this.coordinates.x, this.coordinates.y, 1);
            // this.activate(false);
        }
        isDiscovered() {
            this.discovered = true;
            this.activate(true);
        }
    }
})(UI || (UI = {}));
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
var Networking;
///<reference path="../FUDGE/Net/Build/Client/FudgeClient.d.ts"/>
(function (Networking) {
    let FUNCTION;
    (function (FUNCTION) {
        FUNCTION[FUNCTION["CONNECTED"] = 0] = "CONNECTED";
        FUNCTION[FUNCTION["SETGAMESTATE"] = 1] = "SETGAMESTATE";
        FUNCTION[FUNCTION["LOADED"] = 2] = "LOADED";
        FUNCTION[FUNCTION["SETREADY"] = 3] = "SETREADY";
        FUNCTION[FUNCTION["SPAWN"] = 4] = "SPAWN";
        FUNCTION[FUNCTION["TRANSFORM"] = 5] = "TRANSFORM";
        FUNCTION[FUNCTION["CLIENTMOVEMENT"] = 6] = "CLIENTMOVEMENT";
        FUNCTION[FUNCTION["SERVERBUFFER"] = 7] = "SERVERBUFFER";
        FUNCTION[FUNCTION["UPDATEINVENTORY"] = 8] = "UPDATEINVENTORY";
        FUNCTION[FUNCTION["KNOCKBACKREQUEST"] = 9] = "KNOCKBACKREQUEST";
        FUNCTION[FUNCTION["KNOCKBACKPUSH"] = 10] = "KNOCKBACKPUSH";
        FUNCTION[FUNCTION["SPAWNBULLET"] = 11] = "SPAWNBULLET";
        FUNCTION[FUNCTION["BULLETPREDICT"] = 12] = "BULLETPREDICT";
        FUNCTION[FUNCTION["BULLETTRANSFORM"] = 13] = "BULLETTRANSFORM";
        FUNCTION[FUNCTION["BULLETDIE"] = 14] = "BULLETDIE";
        FUNCTION[FUNCTION["SPAWNENEMY"] = 15] = "SPAWNENEMY";
        FUNCTION[FUNCTION["ENEMYTRANSFORM"] = 16] = "ENEMYTRANSFORM";
        FUNCTION[FUNCTION["ENTITYANIMATIONSTATE"] = 17] = "ENTITYANIMATIONSTATE";
        FUNCTION[FUNCTION["ENTITYDIE"] = 18] = "ENTITYDIE";
        FUNCTION[FUNCTION["SPAWNINTERNALITEM"] = 19] = "SPAWNINTERNALITEM";
        FUNCTION[FUNCTION["UPDATEATTRIBUTES"] = 20] = "UPDATEATTRIBUTES";
        FUNCTION[FUNCTION["UPDATEWEAPON"] = 21] = "UPDATEWEAPON";
        FUNCTION[FUNCTION["ITEMDIE"] = 22] = "ITEMDIE";
        FUNCTION[FUNCTION["SENDROOM"] = 23] = "SENDROOM";
        FUNCTION[FUNCTION["SWITCHROOMREQUEST"] = 24] = "SWITCHROOMREQUEST";
        FUNCTION[FUNCTION["UPDATEBUFF"] = 25] = "UPDATEBUFF";
        FUNCTION[FUNCTION["UPDATEUI"] = 26] = "UPDATEUI";
        FUNCTION[FUNCTION["SPWANMINIMAP"] = 27] = "SPWANMINIMAP";
        FUNCTION[FUNCTION["SPAWNZIPZAP"] = 28] = "SPAWNZIPZAP";
    })(FUNCTION = Networking.FUNCTION || (Networking.FUNCTION = {}));
    var ƒClient = FudgeNet.FudgeClient;
    Networking.createdRoom = false;
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
                if (message.command == FudgeNet.COMMAND.ROOM_CREATE) {
                    console.log(message.content.room);
                    let html = document.getElementById("RoomId");
                    html.parentElement.style.visibility = "visible";
                    html.textContent = message.content.room;
                    Networking.createdRoom = true;
                    joinRoom(message.content.room);
                }
                if (message.command == FudgeNet.COMMAND.ROOM_ENTER) {
                    if (Networking.createdRoom) {
                        Networking.client.becomeHost();
                    }
                }
                if (message.command == FudgeNet.COMMAND.ROOM_GET_IDS) {
                    if (message.content != undefined && document.getElementById("Hostscreen").style.visibility != "hidden") {
                        let rooms = message.content.rooms;
                        document.getElementById("Rooms").innerHTML = "";
                        if (rooms.length > 0) {
                            let newRooms = [];
                            rooms.forEach(room => {
                                if (room != "Lobby") {
                                    newRooms.push("<p>" + room + "</p>");
                                }
                            });
                            document.getElementById("Rooms").innerHTML = newRooms.toString().replaceAll(",", "");
                        }
                        setTimeout(() => {
                            getRooms();
                        }, 5000);
                    }
                }
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
                    //SPAWN MINIMAP BY CLIENT
                    if (message.content != undefined && message.content.text == FUNCTION.SPWANMINIMAP.toString()) {
                        let oldMiniMapInfo = message.content.miniMapInfos;
                        let newMiniMapInfo = [];
                        for (let i = 0; i < oldMiniMapInfo.length; i++) {
                            let newCoords = new Game.ƒ.Vector2(oldMiniMapInfo[i].coords.data[0], oldMiniMapInfo[i].coords.data[1]);
                            newMiniMapInfo.push({ coords: newCoords, roomType: oldMiniMapInfo[i].roomType });
                        }
                        Game.miniMap = new UI.Minimap(newMiniMapInfo);
                        Game.graph.addChild(Game.miniMap);
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
                        let netObj = Game.currentNetObj.find(entity => entity.netId == message.content.netId);
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
                        let netObj = Game.currentNetObj.find(elem => elem.netId == message.content.netId);
                        let bullet;
                        if (netObj != undefined) {
                            bullet = netObj.netObjectNode;
                            // console.log(bullet + "" + message.content.netId);
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
                        let attributes = new Entity.Attributes(message.content.attributes.healthPoints, message.content.attributes.attackPoints, message.content.attributes.speed, message.content.attributes.scale, message.content.attributes.knockbackForce, message.content.attributes.armor, message.content.attributes.coolDownReduction, message.content.attributes.accuracy);
                        if (message.content.type == Entity.ID.MELEE) {
                            Game.avatar2 = new Player.Melee(Entity.ID.MELEE, attributes, netId);
                            Game.avatar2.mtxLocal.translation = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], 0);
                            Game.graph.addChild(Game.avatar2);
                        }
                        else if (message.content.type == Entity.ID.RANGED) {
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
                                newItem = new Items.BuffItem(message.content.itemId, message.content.itemNetId);
                            }
                            else if (Items.getInternalItemById(message.content.itemId) != null) {
                                newItem = new Items.InternalItem(message.content.itemId, message.content.itemNetId);
                            }
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            if (message.content.add) {
                                entity.items.push(newItem);
                            }
                            else {
                                entity.items.splice(entity.items.indexOf(entity.items.find(item => item.id == newItem.id)), 1);
                            }
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
                                let direciton = new Game.ƒ.Vector3(message.content.direction.data[0], message.content.direction.data[1], message.content.direction.data[2]);
                                switch (message.content.aimType) {
                                    case Weapons.AIM.NORMAL:
                                        bullet = new Bullets.Bullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, message.content.bulletNetId);
                                        break;
                                    case Weapons.AIM.HOMING:
                                        let bulletTarget = new Game.ƒ.Vector3(message.content.bulletTarget.data[0], message.content.bulletTarget.data[1], message.content.bulletTarget.data[2]);
                                        bullet = new Bullets.HomingBullet(weapon.bulletType, entity.mtxLocal.translation.toVector2(), direciton, entity.netId, bulletTarget, message.content.bulletNetId);
                                        break;
                                    default:
                                        break;
                                }
                                Game.graph.addChild(bullet);
                            }
                        }
                        //Sync bullet transform from host to client
                        if (message.content != undefined && message.content.text == FUNCTION.BULLETTRANSFORM.toString()) {
                            if (Game.currentNetObj.find(element => element.netId == message.content.netId) != undefined) {
                                if (Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode != null) {
                                    let newPosition = new Game.ƒ.Vector3(message.content.position.data[0], message.content.position.data[1], message.content.position.data[2]);
                                    let newRotation = new Game.ƒ.Vector3(message.content.rotation.data[0], message.content.rotation.data[1], message.content.rotation.data[2]);
                                    Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.translation = newPosition;
                                    Game.currentNetObj.find(element => element.netId == message.content.netId).netObjectNode.mtxLocal.rotation = newRotation;
                                }
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
                            EnemySpawner.networkSpawnById(message.content.enemyClass, message.content.id, new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]), message.content.netId, message.content.target);
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
                        //Kill entity at the client from host
                        if (message.content != undefined && message.content.text == FUNCTION.ENTITYDIE.toString()) {
                            let entity = Game.entities.find(enem => enem.netId == message.content.netId);
                            if (entity != undefined) {
                                entity.die();
                            }
                        }
                        //update Entity buff List
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEBUFF.toString()) {
                            let buffList = message.content.buffList;
                            let entity = Game.entities.find(ent => ent.netId == message.content.netId);
                            if (entity != undefined) {
                                entity.buffs.forEach(oldBuff => {
                                    let buffToCheck = buffList.find(buff => buff.id == oldBuff.id);
                                    if (buffToCheck == undefined) {
                                        oldBuff.removeBuff(entity);
                                    }
                                });
                                buffList.forEach(buff => {
                                    let newBuff = Buff.getBuffById(buff.id);
                                    newBuff.tickRate = buff.tickRate;
                                    newBuff.duration = buff.duration;
                                    newBuff.addToEntity(entity);
                                });
                            }
                        }
                        //update UI
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEUI.toString()) {
                            let position = new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]);
                            Game.graph.addChild(new UI.DamageUI(position.toVector3(), message.content.value));
                        }
                        //spawn special items
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNZIPZAP.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                let item = new Bullets.ZipZapObject(message.content.ownerNetId, message.content.netId);
                                item.spawn();
                            }
                        }
                        //Spawn item from host
                        if (message.content != undefined && message.content.text == FUNCTION.SPAWNINTERNALITEM.toString()) {
                            if (Networking.client.id != Networking.client.idHost) {
                                if (Items.getBuffItemById(message.content.id) != null) {
                                    let newItem = new Items.BuffItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                    Game.graph.addChild(newItem);
                                }
                                else if (Items.getInternalItemById(message.content.id) != null) {
                                    let newItem = new Items.InternalItem(message.content.id, message.content.netId);
                                    newItem.setPosition(new ƒ.Vector2(message.content.position.data[0], message.content.position.data[1]));
                                    Game.graph.addChild(newItem);
                                }
                            }
                        }
                        //apply item attributes
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEATTRIBUTES.toString()) {
                            let entity = Game.entities.find(elem => elem.netId == message.content.netId);
                            switch (message.content.payload.type) {
                                case Entity.ATTRIBUTETYPE.HEALTHPOINTS:
                                    entity.attributes.healthPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.MAXHEALTHPOINTS:
                                    entity.attributes.maxHealthPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.KNOCKBACKFORCE:
                                    entity.attributes.knockbackForce = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.HITABLE:
                                    entity.attributes.hitable = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.ARMOR:
                                    entity.attributes.armor = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.SPEED:
                                    entity.attributes.speed = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.ATTACKPOINTS:
                                    entity.attributes.attackPoints = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.COOLDOWNREDUCTION:
                                    entity.attributes.coolDownReduction = message.content.payload.value;
                                    break;
                                case Entity.ATTRIBUTETYPE.SCALE:
                                    entity.attributes.scale = message.content.payload.value;
                                    entity.updateScale();
                                    break;
                            }
                        }
                        //apply weapon
                        if (message.content != undefined && message.content.text == FUNCTION.UPDATEWEAPON.toString()) {
                            let refWeapon = message.content.weapon;
                            console.log(message.content.weapon.cooldown.coolDown);
                            const tempWeapon = new Weapons.Weapon(message.content.weapon.cooldown.coolDown, message.content.weapon.attackCount, refWeapon.bulletType, refWeapon.projectileAmount, refWeapon.ownerNetId, refWeapon.aimType);
                            tempWeapon.canShoot = refWeapon.canShoot;
                            Game.entities.find(elem => elem.netId == message.content.netId).weapon = tempWeapon;
                        }
                        //Kill item from host
                        if (message.content != undefined && message.content.text == FUNCTION.ITEMDIE.toString()) {
                            let item = Game.graph.getChildren().find(enem => enem.netId == message.content.netId);
                            Game.graph.removeChild(item);
                            popID(message.content.netId);
                        }
                        //send room 
                        if (message.content != undefined && message.content.text == FUNCTION.SENDROOM.toString()) {
                            let coordiantes = new Game.ƒ.Vector2(message.content.room.coordinates.data[0], message.content.room.coordinates.data[1]);
                            let tanslation = new Game.ƒ.Vector3(message.content.room.translation.data[0], message.content.room.translation.data[1], message.content.room.translation.data[2]);
                            let roomInfo = { coordinates: coordiantes, roomSize: message.content.room.roomSize, exits: message.content.room.exits, roomType: message.content.room.roomType, translation: tanslation };
                            let newRoom;
                            switch (roomInfo.roomType) {
                                case Generation.ROOMTYPE.START:
                                    newRoom = new Generation.StartRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.NORMAL:
                                    newRoom = new Generation.NormalRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.BOSS:
                                    newRoom = new Generation.BossRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.TREASURE:
                                    newRoom = new Generation.TreasureRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.MERCHANT:
                                    newRoom = new Generation.MerchantRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                                case Generation.ROOMTYPE.CHALLENGE:
                                    newRoom = new Generation.ChallengeRoom(roomInfo.coordinates, roomInfo.roomSize);
                                    break;
                            }
                            newRoom.exits = roomInfo.exits;
                            newRoom.mtxLocal.translation = roomInfo.translation;
                            newRoom.setSpawnPoints();
                            newRoom.openDoors();
                            Generation.addRoomToGraph(newRoom);
                        }
                        //send request to switch rooms
                        if (message.content != undefined && message.content.text == FUNCTION.SWITCHROOMREQUEST.toString()) {
                            Generation.switchRoom(message.content.direction);
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
    function createRoom() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_CREATE });
    }
    Networking.createRoom = createRoom;
    function joinRoom(_roomId) {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_ENTER, content: { room: _roomId } });
    }
    Networking.joinRoom = joinRoom;
    function getRooms() {
        Networking.client.dispatch({ route: FudgeNet.ROUTE.SERVER, command: FudgeNet.COMMAND.ROOM_GET_IDS });
    }
    Networking.getRooms = getRooms;
    //#region player
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
    function updateInventory(_add, _itemId, _itemNetId, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
        }
    }
    Networking.updateInventory = updateInventory;
    function spawnMinimap(_miniMapInfos) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPWANMINIMAP, miniMapInfos: _miniMapInfos } });
    }
    Networking.spawnMinimap = spawnMinimap;
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
    //#region specialItems
    function spawnZipZap(_ownerNetId, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNZIPZAP, ownerNetId: _ownerNetId, netId: _netId } });
        }
    }
    Networking.spawnZipZap = spawnZipZap;
    //#endregion
    //#region enemy
    function spawnEnemy(_enemyClass, _enemy, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNENEMY, enemyClass: _enemyClass, id: _enemy.id, attributes: _enemy.attributes, position: _enemy.mtxLocal.translation, netId: _netId, target: _enemy.target } });
        }
    }
    Networking.spawnEnemy = spawnEnemy;
    function updateEnemyPosition(_position, _netId) {
        if (Networking.client.id == Networking.client.idHost) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENEMYTRANSFORM, position: _position, netId: _netId } });
        }
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
    function removeEntity(_netId) {
        Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.ENTITYDIE, netId: _netId } });
    }
    Networking.removeEntity = removeEntity;
    //#endregion
    //#region items
    function spawnItem(_id, _position, _netId) {
        if (Game.connected && Networking.client.idHost == Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.SPAWNINTERNALITEM, id: _id, position: _position, netId: _netId } });
        }
    }
    Networking.spawnItem = spawnItem;
    function updateEntityAttributes(_attributePayload, _netId) {
        if (Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: FudgeNet.ROUTE.HOST, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
        }
        else {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.idHost).id, content: { text: FUNCTION.UPDATEATTRIBUTES, payload: _attributePayload, netId: _netId } });
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
    function switchRoomRequest(_direction) {
        if (Game.connected && Networking.client.idHost != Networking.client.id) {
            Networking.client.dispatch({ route: undefined, idTarget: Networking.client.idHost, content: { text: FUNCTION.SWITCHROOMREQUEST, direction: _direction } });
        }
    }
    Networking.switchRoomRequest = switchRoomRequest;
    //#endregion
    /**
     * generates individual IDs on Host without duplicates returns the given NetId
     * @param _netId if undefined generates a new NetId -> only undefined on Host
     * @returns a new netId or the netId provided by the host
     */
    function IdManager(_netId) {
        if (_netId != undefined) {
            Networking.currentIDs.push(_netId);
            return _netId;
        }
        else {
            return generateNewId();
        }
    }
    Networking.IdManager = IdManager;
    function generateNewId() {
        let newId;
        while (true) {
            newId = idGenerator();
            if (Networking.currentIDs.find(id => id == newId) == undefined) {
                break;
            }
        }
        Networking.currentIDs.push(newId);
        return newId;
    }
    function idGenerator() {
        let id = Math.floor(Math.random() * 1000);
        return id;
    }
    function popID(_id) {
        Networking.currentIDs.splice(Networking.currentIDs.indexOf(_id), 1);
    }
    Networking.popID = popID;
    function isNetworkObject(_object) {
        return "netId" in _object;
    }
    Networking.isNetworkObject = isNetworkObject;
    function getNetId(_object) {
        if (isNetworkObject(_object)) {
            return _object.netId;
        }
        return null;
    }
    Networking.getNetId = getNetId;
    window.addEventListener("beforeunload", onUnload, false);
    function onUnload() {
        //TODO: Things we do after the player left the game
    }
})(Networking || (Networking = {}));
var Player;
(function (Player_1) {
    class Player extends Entity.Entity {
        weapon = new Weapons.Weapon(25, 1, Bullets.BULLETTYPE.STANDARD, 1, this.netId, Weapons.AIM.NORMAL);
        client;
        abilityCount = 1;
        currentabilityCount = this.abilityCount;
        constructor(_id, _attributes, _netId) {
            super(_id, _netId);
            this.attributes = _attributes;
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
        }
        openDoor() {
            let walls = Game.currentRoom.getChildren();
            walls.forEach((wall) => {
                if (wall.door != undefined && wall.door.isActive) {
                    if (this.collider.collidesRect(wall.door.collider)) {
                        wall.door.changeRoom();
                    }
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
            //TODO: uncomment
            // this.calculateCollider(enemiesCollider, _direction);
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
                    if (item instanceof Items.InternalItem && item.choosenOneNetId != undefined) {
                        if (item.choosenOneNetId != this.netId) {
                            return;
                        }
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.TREASURE) {
                        Game.currentRoom.onItemCollect(item);
                    }
                    if (Game.currentRoom.roomType == Generation.ROOMTYPE.MERCHANT) {
                        if (!Game.currentRoom.onItemCollect(item, this)) {
                            return;
                        }
                    }
                    Networking.updateInventory(true, item.id, item.netId, this.netId);
                    item.addItemToEntity(this);
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
        swordRadius = 0.75;
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        // public attack(_direction: ƒ.Vector3, _netId?: number, _sync?: boolean) {
        //     let newPos: Game.ƒ.Vector2 = this.mtxLocal.translation.clone.toVector2();
        //     if (_direction.magnitude > 0) {
        //         _direction.normalize();
        //         _direction.scale(0.5);
        //     }
        //     newPos.add(_direction.toVector2());
        //     let swordCollider: Collider.Collider = new Collider.Collider(newPos, this.swordRadius / 2, this.netId);
        //     Game.enemies.forEach(enemy => {
        //         if (swordCollider.collides(enemy.collider)) {
        //             enemy.getDamage(this.attributes.attackPoints);
        //         }
        //     })
        // }
        //Block
        doAbility() {
            this.block.doAbility();
        }
    }
    Player_1.Melee = Melee;
    class Ranged extends Player {
        dash = new Ability.Dash(this.netId, 8, 1, 60, 5);
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
    class EnemyCountManager {
        maxEnemyCount;
        get getMaxEnemyCount() { return this.maxEnemyCount; }
        ;
        currentEnemyCoount;
        finished;
        constructor(_enemyCount) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCoount = _enemyCount;
            this.finished = false;
            if (_enemyCount <= 0) {
                this.finished = true;
            }
        }
        onEnemyDeath() {
            this.currentEnemyCoount--;
            if (this.currentEnemyCoount <= 0) {
                this.finished = true;
            }
        }
    }
    Generation.EnemyCountManager = EnemyCountManager;
    Generation.txtStartRoom = new Game.ƒ.TextureImage();
    class Room extends ƒ.Node {
        tag;
        roomType;
        coordinates;
        walls = [];
        obsticals = [];
        enemyCountManager;
        positionUpdated = false;
        roomSize = 30;
        exits; // N E S W
        mesh = new ƒ.MeshQuad;
        cmpMesh = new ƒ.ComponentMesh(this.mesh);
        avatarSpawnPointN;
        get getSpawnPointN() { return this.avatarSpawnPointN; }
        ;
        avatarSpawnPointE;
        get getSpawnPointE() { return this.avatarSpawnPointE; }
        ;
        avatarSpawnPointS;
        get getSpawnPointS() { return this.avatarSpawnPointS; }
        ;
        avatarSpawnPointW;
        get getSpawnPointW() { return this.avatarSpawnPointW; }
        ;
        cmpMaterial = new ƒ.ComponentMaterial();
        constructor(_coordiantes, _roomSize, _roomType) {
            super("room");
            this.tag = Tag.TAG.ROOM;
            this.coordinates = _coordiantes;
            this.enemyCountManager = new EnemyCountManager(0);
            if (_roomSize != undefined) {
                this.roomSize = _roomSize;
            }
            if (_roomType != undefined) {
                this.roomType = _roomType;
            }
            this.exits = { north: false, east: false, south: false, west: false };
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scaling = new ƒ.Vector3(this.roomSize, this.roomSize, 1);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 0, -0.01);
            this.addWalls();
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        onAddToGraph() {
        }
        update() {
        }
        addWalls() {
            this.addChild((new Wall(new ƒ.Vector2(0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, 0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(-0.5, 0), new ƒ.Vector2(1 / this.roomSize, 1 + 1 / this.roomSize), this)));
            this.addChild((new Wall(new ƒ.Vector2(0, -0.5), new ƒ.Vector2(1, 1 / this.roomSize), this)));
            this.getChildren().filter(elem => elem.tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push(wall);
            });
        }
        setSpawnPoints() {
            this.avatarSpawnPointE = new ƒ.Vector2(this.mtxLocal.translation.x + ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointW = new ƒ.Vector2(this.mtxLocal.translation.x - ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointN = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y + ((this.roomSize / 2) - 2));
            this.avatarSpawnPointS = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y - ((this.roomSize / 2) - 2));
        }
        getRoomSize() {
            return this.roomSize;
        }
        setRoomExit(_neighbour) {
            let dif = Game.ƒ.Vector2.DIFFERENCE(_neighbour.coordinates, this.coordinates);
            if (dif.equals(Generation.compareNorth)) {
                this.exits.north = true;
            }
            if (dif.equals(Generation.compareEast)) {
                this.exits.east = true;
            }
            if (dif.equals(Generation.compareSouth)) {
                this.exits.south = true;
            }
            if (dif.equals(Generation.compareWest)) {
                this.exits.west = true;
            }
        }
        openDoors() {
            if (this.exits.north) {
                this.walls.find(wall => wall.door.direction.north == true).door.openDoor();
            }
            if (this.exits.east) {
                this.walls.find(wall => wall.door.direction.east == true).door.openDoor();
            }
            if (this.exits.south) {
                this.walls.find(wall => wall.door.direction.south == true).door.openDoor();
            }
            if (this.exits.west) {
                this.walls.find(wall => wall.door.direction.west == true).door.openDoor();
            }
        }
    }
    Generation.Room = Room;
    class StartRoom extends Room {
        startRoomMat = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Generation.txtStartRoom));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.START);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }
    Generation.StartRoom = StartRoom;
    class NormalRoom extends Room {
        normalRoomMat = new ƒ.Material("normalRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("white")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.enemyCountManager = new EnemyCountManager(5);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }
    Generation.NormalRoom = NormalRoom;
    class BossRoom extends Room {
        bossRoomMat = new ƒ.Material("bossRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }
    }
    Generation.BossRoom = BossRoom;
    class TreasureRoom extends Room {
        treasureRoomMat = new ƒ.Material("treasureRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("yellow")));
        spawnChance = 25;
        get getSpawnChance() { return this.spawnChance; }
        ;
        treasureCount = 2;
        treasures = [];
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
            if (Networking.client.id == Networking.client.idHost) {
                this.createTreasures();
            }
        }
        createTreasures() {
            let treasures = [];
            for (let i = 0; i < this.treasureCount; i++) {
                treasures.push(Items.ItemGenerator.getRandomItem());
            }
            this.treasures = treasures;
        }
        onAddToGraph() {
            let i = 0;
            this.treasures.forEach(item => {
                item.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + i, this.mtxLocal.translation.y));
                item.spawn();
                i++;
            });
        }
        onItemCollect(_item) {
            if (this.treasures.find(item => item == _item) != undefined) {
                this.treasures.splice(this.treasures.indexOf(_item), 1);
            }
        }
    }
    Generation.TreasureRoom = TreasureRoom;
    class MerchantRoom extends Room {
        merchantRoomMat = new ƒ.Material("merchantRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")));
        merchant = new Entity.Merchant(Entity.ID.MERCHANT);
        items = [];
        itemsSpawnPoints = [];
        itemCount = 5;
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.MERCHANT);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.merchantRoomMat;
            this.merchant.mtxLocal.translateZ(0.01);
            this.merchant.mtxLocal.translateY(5 / this.roomSize);
            this.merchant.mtxLocal.scale(Game.ƒ.Vector3.ONE(1 / this.roomSize));
            this.addChild(this.merchant);
            if (Networking.client.id == Networking.client.idHost) {
                this.createShop();
            }
        }
        createShop() {
            let items = [];
            for (let i = 0; i < this.itemCount; i++) {
                items.push(Items.ItemGenerator.getRandomItem());
            }
            this.items = items;
        }
        onAddToGraph() {
            this.createSpawnPoints();
            let i = 0;
            this.items.forEach(item => {
                if (item.getPosition != undefined) {
                    if (this.itemsSpawnPoints.find(pos => pos.equals(item.getPosition)) == undefined) {
                        item.setPosition(this.itemsSpawnPoints[i]);
                    }
                }
                else {
                    item.setPosition(this.itemsSpawnPoints[i]);
                }
                item.spawn();
                i++;
            });
        }
        createSpawnPoints() {
            this.itemsSpawnPoints = [];
            let middle = this.mtxWorld.clone.translation;
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 2, middle.y + 1));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 2, middle.y + 1));
        }
        onItemCollect(_item, _avatar) {
            if (this.items.find(item => item == _item) != undefined) {
                return this.shoping(_item, _avatar);
            }
            return false;
        }
        shoping(_item, _avatar) {
            let sameRarity = _avatar.items.filter(item => item.rarity == _item.rarity);
            let lowerRarity = [];
            if (_item.rarity != Items.RARITY.COMMON) {
                lowerRarity = _avatar.items.filter(item => item.rarity == (_item.rarity - 1));
            }
            if (sameRarity.length > 0) {
                let index = Math.round(Math.random() * (sameRarity.length - 1));
                sameRarity[index].removeItemToEntity(_avatar);
                this.items.splice(this.items.indexOf(_item), 1);
                Networking.updateInventory(false, sameRarity[index].id, sameRarity[index].netId, _avatar.netId);
            }
            else {
                if (lowerRarity.length >= 3) {
                    let index1 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index1].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index1]), 1);
                    lowerRarity.slice(index1, 1);
                    lowerRarity.splice(index1, 1);
                    Networking.updateInventory(false, lowerRarity[index1].id, lowerRarity[index1].netId, _avatar.netId);
                    let index2 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index2].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index2]), 1);
                    lowerRarity.slice(index2, 1);
                    lowerRarity.splice(index2, 1);
                    Networking.updateInventory(false, lowerRarity[index2].id, lowerRarity[index2].netId, _avatar.netId);
                    let index3 = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index3].removeItemToEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index3]), 1);
                    lowerRarity.slice(index3, 1);
                    lowerRarity.splice(index3, 1);
                    Networking.updateInventory(false, lowerRarity[index3].id, lowerRarity[index3].netId, _avatar.netId);
                    this.items.splice(this.items.indexOf(_item), 1);
                }
                else {
                    return false;
                }
            }
            return true;
        }
    }
    Generation.MerchantRoom = MerchantRoom;
    let CHALLENGE;
    (function (CHALLENGE) {
        CHALLENGE[CHALLENGE["THORSHAMMER"] = 0] = "THORSHAMMER";
    })(CHALLENGE || (CHALLENGE = {}));
    class ChallengeRoom extends Room {
        challenge;
        challengeRoomMat = new ƒ.Material("challengeRoomMat", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("blue")));
        constructor(_coordinates, _roomSize) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
            this.enemyCountManager = new EnemyCountManager(10);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.challengeRoomMat;
            this.challenge = this.randomChallenge();
        }
        randomChallenge() {
            let index = Math.round(Math.random() * (Object.keys(CHALLENGE).length / 2 - 1));
            return CHALLENGE[CHALLENGE[index]];
        }
        update() {
            if (this.enemyCountManager.finished) {
                if (Networking.client.id == Networking.client.idHost) {
                    switch (this.challenge) {
                        case CHALLENGE.THORSHAMMER:
                            this.stopThorsHammerChallenge();
                            break;
                        default:
                            break;
                    }
                }
            }
        }
        onAddToGraph() {
            if (Networking.client.id == Networking.client.idHost) {
                switch (this.challenge) {
                    case CHALLENGE.THORSHAMMER:
                        this.startThorsHammerChallenge();
                        break;
                    default:
                        break;
                }
            }
        }
        startThorsHammerChallenge() {
            //TODO: activate
            // if (this.enemyCountManager.finished) {
            //     return;
            // }
            Game.avatar1.weapon.canShoot = false;
            Game.avatar2.weapon.canShoot = false;
            let thorshammer = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
            let choosenOne;
            if (Math.round(Math.random()) > 0) {
                choosenOne = Game.avatar1;
            }
            else {
                choosenOne = Game.avatar2;
            }
            thorshammer.addItemToEntity(choosenOne);
            Networking.updateInventory(true, thorshammer.id, thorshammer.netId, choosenOne.netId);
            Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
            Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
        }
        stopThorsHammerChallenge() {
            let avatar1Inv = Game.avatar1.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            let avatar2Inv = Game.avatar2.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (avatar1Inv != undefined) {
                    Game.avatar1.items.splice(Game.avatar1.items.indexOf(avatar1Inv), 1);
                    Networking.updateInventory(false, avatar1Inv.id, avatar1Inv.netId, Game.avatar1.netId);
                    Game.avatar1.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                    Game.avatar1.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                    Game.avatar1.weapon.bulletType = Bullets.BULLETTYPE[localStorage.getItem("bulletType")];
                    Game.avatar1.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                }
                if (avatar2Inv != undefined) {
                    Game.avatar2.items.splice(Game.avatar2.items.indexOf(avatar2Inv), 1);
                    Networking.updateInventory(false, avatar2Inv.id, avatar2Inv.netId, Game.avatar2.netId);
                    Game.avatar2.weapon.getCoolDown.setMaxCoolDown = +localStorage.getItem("cooldownTime");
                    Game.avatar2.weapon.aimType = Weapons.AIM[localStorage.getItem("aimType")];
                    Game.avatar2.weapon.bulletType = Bullets.BULLETTYPE[localStorage.getItem("bulletType")];
                    Game.avatar2.weapon.projectileAmount = +localStorage.getItem("projectileAmount");
                }
                Game.avatar1.weapon.canShoot = true;
                Game.avatar2.weapon.canShoot = true;
                Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
                Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
            }
            let roomInv = Game.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            if (roomInv != undefined) {
                roomInv.despawn();
            }
        }
    }
    Generation.ChallengeRoom = ChallengeRoom;
    class Wall extends ƒ.Node {
        tag = Tag.TAG.WALL;
        collider;
        door;
        normal;
        get getNormal() { return this.normal; }
        ;
        constructor(_pos, _scaling, _room) {
            super("Wall");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("red")))));
            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.translation = newPos;
            this.mtxLocal.scaling = _scaling.toVector3(1);
            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(-1, 0, 0);
                }
                else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(1, 0, 0);
                }
            }
            else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, -1, 0);
                }
                else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, 1, 0);
                }
            }
        }
        addDoor(_pos, _scaling) {
            this.door = new Door();
            this.addChild(this.door);
            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.direction = { north: false, east: true, south: false, west: false };
                    this.door.mtxLocal.translateX(-0.5);
                }
                else {
                    this.door.direction = { north: false, east: false, south: false, west: true };
                    this.door.mtxLocal.translateX(0.5);
                }
            }
            else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.direction = { north: true, east: false, south: false, west: false };
                    this.door.mtxLocal.translateY(-0.5);
                }
                else {
                    this.door.direction = { north: false, east: false, south: true, west: false };
                    this.door.mtxLocal.translateY(0.5);
                }
            }
        }
        setCollider() {
            this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
    }
    Generation.Wall = Wall;
    class Door extends ƒ.Node {
        tag = Tag.TAG.DOOR;
        collider;
        direction;
        constructor() {
            super("Door");
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("green", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("green")))));
            this.mtxLocal.translateZ(0.1);
            this.closeDoor();
        }
        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }
        changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.direction);
            }
            else {
                Networking.switchRoomRequest(this.direction);
            }
        }
        openDoor() {
            this.activate(true);
        }
        closeDoor() {
            this.activate(false);
        }
    }
    Generation.Door = Door;
    class Obsitcal extends ƒ.Node {
        tag = Tag.TAG.OBSTICAL;
        collider;
        parentRoom;
        direction;
        constructor(_parent, _position, _scale) {
            super("Obstical");
            this.parentRoom = _parent;
            this.parentRoom.obsticals.push(this);
            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderFlat, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));
            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));
            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
    Generation.Obsitcal = Obsitcal;
})(Generation || (Generation = {}));
var Generation;
(function (Generation) {
    let numberOfRooms = 5;
    Generation.generationFailed = false;
    Generation.rooms = [];
    Generation.compareNorth = new ƒ.Vector2(0, 1);
    Generation.compareEast = new ƒ.Vector2(1, 0);
    Generation.compareSouth = new ƒ.Vector2(0, -1);
    Generation.compareWest = new ƒ.Vector2(-1, 0);
    //spawn chances
    let challengeRoomSpawnChance = 30;
    function procedualRoomGeneration() {
        Generation.rooms = [];
        Generation.generationFailed = false;
        Generation.rooms.push(generateStartRoom());
        Generation.rooms.push.apply(Generation.rooms, generateNormalRooms());
        addBossRoom();
        Generation.rooms.push.apply(Generation.rooms, generateTreasureRoom());
        Generation.rooms.push(generateMerchantRoom());
        Generation.rooms.push(generateChallengeRoom());
        setExits();
        Generation.rooms.forEach(room => { console.log(room.mtxLocal.translation.clone.toString()); });
        moveRoomToWorldCoords(Generation.rooms[0]);
        setExits();
        addRoomToGraph(Generation.rooms[0]);
    }
    Generation.procedualRoomGeneration = procedualRoomGeneration;
    /**
     * generates a grid thats connected toggether from a given starting point
     * @param _startCoord the starting point
     * @returns vector2 array of a connecting grid without overlaps
     */
    function generateSnakeGrid(_startCoord) {
        let grid = [];
        grid.push(_startCoord);
        for (let i = 0; i < numberOfRooms; i++) {
            let nextCoord = getNextPossibleCoordFromSpecificCoord(grid, grid[grid.length - 1]);
            if (nextCoord == undefined) {
                break;
            }
            else {
                grid.push(nextCoord);
            }
        }
        return grid;
    }
    /**
     * function to get a random neigihbour taking care of an acutal grid
     * @param _grid existing grid the function should care about
     * @param _specificCoord the coord you want the next possible coord
     * @returns a vector2 coord thats not inside of _grid and around  _specificCoord
     */
    function getNextPossibleCoordFromSpecificCoord(_grid, _specificCoord) {
        let coordNeighbours = getNeighbourCoordinate(_specificCoord);
        for (let i = 0; i < coordNeighbours.length; i++) {
            let randomIndex = Math.round(Math.random() * (coordNeighbours.length - 1));
            let nextCoord = coordNeighbours[randomIndex];
            if (_grid.find(coord => coord.equals(nextCoord))) {
                coordNeighbours = coordNeighbours.filter(coord => !coord.equals(nextCoord));
                continue;
            }
            else {
                return nextCoord;
            }
        }
        return null;
    }
    /**
     * function to get all neighbours ignoring the current grid
     * @param _coord coordiante you want the neighbour from
     * @returns 4 neighbours in direction N E S and W
     */
    function getNeighbourCoordinate(_coord) {
        let neighbours = [];
        neighbours.push(new ƒ.Vector2(_coord.x + 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x - 1, _coord.y));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y + 1));
        neighbours.push(new ƒ.Vector2(_coord.x, _coord.y - 1));
        return neighbours;
    }
    function generateStartRoom() {
        let startRoom = new Generation.StartRoom(new ƒ.Vector2(0, 0), 20);
        return startRoom;
    }
    function generateNormalRooms() {
        let gridCoords;
        let normalRooms = [];
        while (true) {
            gridCoords = generateSnakeGrid(Generation.rooms[0].coordinates);
            if ((gridCoords.length - 1) == numberOfRooms) {
                break;
            }
        }
        gridCoords.forEach(coord => {
            normalRooms.push(new Generation.NormalRoom(coord, 20));
        });
        return normalRooms;
    }
    function addBossRoom() {
        let biggestDistance = ƒ.Vector2.ZERO();
        Generation.rooms.forEach(room => {
            if (Math.abs(room.coordinates.x) > biggestDistance.x && Math.abs(room.coordinates.y) > biggestDistance.y) {
                biggestDistance = room.coordinates;
            }
        });
        let roomCoord = getCoordsFromRooms();
        let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 1]);
        if (nextCoord == undefined) {
            // nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoord, roomCoord[roomCoord.length - 2]);
            Generation.generationFailed = true;
        }
        else {
            Generation.rooms.push(new Generation.BossRoom(nextCoord, 30));
        }
    }
    function generateTreasureRoom() {
        let roomCoords = getCoordsFromRooms();
        let newTreasureRooms = [];
        Generation.rooms.forEach(room => {
            if (room.roomType == Generation.ROOMTYPE.NORMAL) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(roomCoords, room.coordinates);
                if (nextCoord != undefined) {
                    let trRoom = new Generation.TreasureRoom(nextCoord, 10);
                    if (isSpawning(trRoom.getSpawnChance)) {
                        newTreasureRooms.push(trRoom);
                    }
                }
            }
        });
        return newTreasureRooms;
    }
    function generateMerchantRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.MerchantRoom(nextCoord, 20);
                }
            }
        }
        Generation.generationFailed = true;
        return null;
    }
    function generateChallengeRoom() {
        for (let i = 0; i < Generation.rooms.length; i++) {
            if (i > 0) {
                let nextCoord = getNextPossibleCoordFromSpecificCoord(getCoordsFromRooms(), Generation.rooms[i].coordinates);
                if (nextCoord != undefined) {
                    return new Generation.ChallengeRoom(nextCoord, 20);
                }
            }
        }
        Generation.generationFailed = true;
        return null;
    }
    /**
     * function to get coordiantes from all existing rooms
     * @returns Vector2 array with coordinates of all current existing rooms in RoomGeneration.rooms
     */
    function getCoordsFromRooms() {
        let coords = [];
        Generation.rooms.forEach(room => {
            coords.push(room.coordinates);
        });
        return coords;
    }
    Generation.getCoordsFromRooms = getCoordsFromRooms;
    function setExits() {
        Generation.rooms.forEach(room => {
            let neighbours = Generation.rooms.filter(element => element != room);
            neighbours.forEach(neighbour => {
                room.setRoomExit(neighbour);
                room.setSpawnPoints();
                room.openDoors();
            });
        });
    }
    function isSpawning(_spawnChance) {
        let x = Math.round(Math.random() * 100);
        if (x < _spawnChance) {
            return true;
        }
        return false;
    }
    function moveRoomToWorldCoords(_firstRoom) {
        let neighbourN = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y + 1))));
        let neighbourE = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x + 1), _firstRoom.coordinates.clone.y)));
        let neighbourS = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2(_firstRoom.coordinates.clone.x, (_firstRoom.coordinates.clone.y - 1))));
        let neighbourW = Generation.rooms.find(room => room.coordinates.equals(new Game.ƒ.Vector2((_firstRoom.coordinates.clone.x - 1), _firstRoom.coordinates.clone.y)));
        if (neighbourN != undefined && !neighbourN.positionUpdated) {
            neighbourN.mtxLocal.translation = new ƒ.Vector3(neighbourN.coordinates.x * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), neighbourN.coordinates.y * (_firstRoom.roomSize / 2 + neighbourN.roomSize / 2), -0.01);
            neighbourN.positionUpdated = true;
            moveRoomToWorldCoords(neighbourN);
        }
        if (neighbourE != undefined && !neighbourE.positionUpdated) {
            neighbourE.mtxLocal.translation = new ƒ.Vector3(neighbourE.coordinates.x * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), neighbourE.coordinates.y * (_firstRoom.roomSize / 2 + neighbourE.roomSize / 2), -0.01);
            neighbourE.positionUpdated = true;
            moveRoomToWorldCoords(neighbourE);
        }
        if (neighbourS != undefined && !neighbourS.positionUpdated) {
            neighbourS.mtxLocal.translation = new ƒ.Vector3(neighbourS.coordinates.x * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), neighbourS.coordinates.y * (_firstRoom.roomSize / 2 + neighbourS.roomSize / 2), -0.01);
            neighbourS.positionUpdated = true;
            moveRoomToWorldCoords(neighbourS);
        }
        if (neighbourW != undefined && !neighbourW.positionUpdated) {
            neighbourW.mtxLocal.translation = new ƒ.Vector3(neighbourW.coordinates.x * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), neighbourW.coordinates.y * (_firstRoom.roomSize / 2 + neighbourW.roomSize / 2), -0.01);
            neighbourW.positionUpdated = true;
            moveRoomToWorldCoords(neighbourW);
        }
    }
    function switchRoom(_direction) {
        if (Game.currentRoom.enemyCountManager.finished) {
            let newRoom;
            let newPosition;
            if (_direction.north) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y + 1)));
                newPosition = newRoom.getSpawnPointS;
            }
            if (_direction.east) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x + 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointW;
            }
            if (_direction.south) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x, Game.currentRoom.coordinates.y - 1)));
                newPosition = newRoom.getSpawnPointN;
            }
            if (_direction.west) {
                newRoom = Generation.rooms.find(room => room.coordinates.equals(new ƒ.Vector2(Game.currentRoom.coordinates.x - 1, Game.currentRoom.coordinates.y)));
                newPosition = newRoom.getSpawnPointE;
            }
            if (newRoom == undefined) {
                console.error("no room found");
                return;
            }
            if (Networking.client.id == Networking.client.idHost) {
                // Game.cmpCamera.mtxPivot.translation = newPosition.toVector3(Game.cmpCamera.mtxPivot.translation.z);
                Game.avatar1.cmpTransform.mtxLocal.translation = newPosition.toVector3();
                Game.avatar2.cmpTransform.mtxLocal.translation = newPosition.toVector3();
            }
            addRoomToGraph(newRoom);
        }
    }
    Generation.switchRoom = switchRoom;
    /**
     * removes erything unreliable from the grpah and adds the new room to the graph , sending it to the client & spawns enemies if existing in room
     * @param _room the room it should spawn
     */
    function addRoomToGraph(_room) {
        Networking.sendRoom({ coordinates: _room.coordinates, roomSize: _room.roomSize, exits: _room.exits, roomType: _room.roomType, translation: _room.mtxLocal.translation });
        let oldObjects = Game.graph.getChildren().filter(elem => (elem.tag != Tag.TAG.PLAYER));
        oldObjects = oldObjects.filter(elem => (elem.tag != Tag.TAG.UI));
        oldObjects.forEach((elem) => {
            Game.graph.removeChild(elem);
        });
        Game.graph.addChild(_room);
        Game.viewport.calculateTransforms();
        if (Networking.client.id == Networking.client.idHost) {
            _room.onAddToGraph();
        }
        _room.walls.forEach(wall => {
            wall.setCollider();
            if (wall.door != undefined) {
                wall.door.setCollider();
            }
        });
        Game.currentRoom = _room;
        EnemySpawner.spawnMultipleEnemiesAtRoom(Game.currentRoom.enemyCountManager.getMaxEnemyCount, Game.currentRoom.mtxLocal.translation.toVector2());
    }
    Generation.addRoomToGraph = addRoomToGraph;
})(Generation || (Generation = {}));
var Entity;
(function (Entity) {
    Entity.txtShadow = new Game.ƒ.TextureImage();
    class Shadow extends Game.ƒ.Node {
        mesh = new ƒ.MeshQuad;
        shadowMatt = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), Entity.txtShadow));
        shadowParent;
        constructor(_parent) {
            super("shadow");
            this.shadowParent = _parent;
            this.addComponent(new Game.ƒ.ComponentMesh(this.mesh));
            let cmpMaterial = new ƒ.ComponentMaterial(this.shadowMatt);
            this.addComponent(cmpMaterial);
            this.addComponent(new Game.ƒ.ComponentTransform());
            this.mtxWorld.translation = new Game.ƒ.Vector3(_parent.mtxLocal.translation.x, _parent.mtxLocal.translation.y, -0.01);
            this.mtxLocal.scaling = new Game.ƒ.Vector3(2, 2, 2);
        }
        updateShadowPos() {
            this.mtxLocal.translation = new ƒ.Vector3(0, 0, this.shadowParent.mtxLocal.translation.z * -1);
        }
    }
    Entity.Shadow = Shadow;
})(Entity || (Entity = {}));
var Weapons;
(function (Weapons) {
    class Weapon {
        ownerNetId;
        get owner() { return Game.entities.find(elem => elem.netId == this.ownerNetId); }
        ;
        cooldown;
        get getCoolDown() { return this.cooldown; }
        ;
        attackCount;
        get getAttackCount() { return this.attackCount; }
        ;
        currentAttackCount;
        aimType;
        bulletType = Bullets.BULLETTYPE.STANDARD;
        projectileAmount = 1;
        canShoot = true;
        constructor(_cooldownTime, _attackCount, _bulletType, _projectileAmount, _ownerNetId, _aimType) {
            this.attackCount = _attackCount;
            this.currentAttackCount = _attackCount;
            this.bulletType = _bulletType;
            this.projectileAmount = _projectileAmount;
            this.ownerNetId = _ownerNetId;
            this.aimType = _aimType;
            this.cooldown = new Ability.Cooldown(_cooldownTime);
        }
        shoot(_position, _direciton, _bulletNetId, _sync) {
            if (this.canShoot) {
                if (_sync) {
                    if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                        this.currentAttackCount = this.attackCount;
                    }
                    if (this.currentAttackCount > 0 && !this.cooldown.hasCoolDown) {
                        if (this.owner.attributes.accuracy < 100) {
                            this.inaccuracy(_direciton);
                        }
                        _direciton.normalize();
                        let magazine = this.loadMagazine(_position, _direciton, this.bulletType, _bulletNetId);
                        this.setBulletDirection(magazine);
                        this.fire(magazine, _sync);
                        this.currentAttackCount--;
                        if (this.currentAttackCount <= 0 && !this.cooldown.hasCoolDown) {
                            this.cooldown.setMaxCoolDown = this.cooldown.getMaxCoolDown * this.owner.attributes.coolDownReduction;
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
        }
        inaccuracy(_direciton) {
            _direciton.x = _direciton.x + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
            _direciton.y = _direciton.y + Math.random() * 10 / this.owner.attributes.accuracy - Math.random() * 10 / this.owner.attributes.accuracy;
        }
        fire(_magazine, _sync) {
            _magazine.forEach(bullet => {
                Game.graph.addChild(bullet);
                if (_sync) {
                    if (bullet instanceof Bullets.HomingBullet) {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId, bullet.target);
                    }
                    else {
                        Networking.spawnBullet(this.aimType, bullet.direction, bullet.netId, this.ownerNetId);
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
                switch (this.aimType) {
                    case AIM.NORMAL:
                        magazine.push(new Bullets.Bullet(this.bulletType, _position, _direction, this.ownerNetId, _netId));
                        break;
                    case AIM.HOMING:
                        magazine.push(new Bullets.HomingBullet(this.bulletType, _position, _direction, this.ownerNetId, null, _netId));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL1RhZy50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1ByZWRpY3Rpb24udHMiLCIuLi9DbGFzc2VzL0FiaWxpdHkudHMiLCIuLi9DbGFzc2VzL0FyZWFPZkVmZmVjdC50cyIsIi4uL0NsYXNzZXMvQXR0cmlidXRlcy50cyIsIi4uL0NsYXNzZXMvQm9zcy50cyIsIi4uL0NsYXNzZXMvQnVmZi50cyIsIi4uL0NsYXNzZXMvQnVsbGV0LnRzIiwiLi4vQ2xhc3Nlcy9Db2xsaWRlci50cyIsIi4uL0NsYXNzZXMvRW5lbXlTcGF3bmVyLnRzIiwiLi4vQ2xhc3Nlcy9GbG9ja2luZy50cyIsIi4uL0NsYXNzZXMvRnJpZW5kbHlDcmVhdHVyZXMudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTWluaW1hcC50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvU2hhZG93LnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBbWNiO0FBeGNELG1CQUFt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LENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzRixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV4RixRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQUEsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQUEsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxVQUFVLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsb0JBQUEsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVuRixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixjQUFjLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxRQUFRLEVBQUUsb0JB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QyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUEsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDM0ksTUFBTTtnQkFDVixLQUFLLFVBQVUsQ0FBQyxRQUFRLENBQUMsTUFBTTtvQkFDM0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUEsVUFBVSxDQUFDLENBQUMsQ0FBQztvQkFDM0ksTUFBTTtnQkFDVixLQUFLLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUTtvQkFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUEsWUFBWSxDQUFDLENBQUMsQ0FBQztvQkFDN0ksTUFBTTtnQkFDVixLQUFLLFVBQVUsQ0FBQyxRQUFRLENBQUMsUUFBUTtvQkFDN0IsSUFBSSxDQUFDLE9BQU8sR0FBRyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxFQUFFLENBQUMsQ0FBQyxpQkFBaUIsRUFBRSxJQUFJLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU8sQ0FBQyxFQUFFLEdBQUEsWUFBWSxDQUFDLENB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R0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SixJQUFJLFVBQVUsR0FBUyxXQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SixJQUFJLFVBQVUsR0FBUyxXQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SixJQUFJLFVBQVUsR0FBUyxXQUFBLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxJQUFJLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLFVBQVUsQ0FBQyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM3SixJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3hELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdk4sVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDbEMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDckM7UUFDRCxJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3hELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsR0FBRyxVQUFVLENBQUMsUUFBUSxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDdk4sVUFBVSxDQUFDLGVBQWUsR0FBRyxJQUFJLENBQUM7WUFDbEMscUJBQXFCLENBQUMsVUFBVSxDQUFDLENBQUM7U0FDckM7UUFDRCxJQUFJLFVBQVUsSUFBSSxTQUFTLElBQUksQ0FBQyxVQUFVLENBQUMsZUFBZSxFQUFFO1lBQ3hELFVBQVUsQ0FBQyxRQUFRLENBQUMsV0FBVyxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FB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R1g7SUFIRCxXQUFZLEdBQUc7UUFDWCxpQ0FBTSxDQUFBO1FBQ04saUNBQU0sQ0FBQTtJQUNWLENBQUMsRUFIVyxHQUFHLEdBQUgsV0FBRyxLQUFILFdBQUcsUUFHZDtBQUVMLENBQUMsRUEvR1MsT0FBTyxLQUFQLE9BQU8sUUErR2hCIiwic291cmNlc0NvbnRlbnQiOlsiLy8jcmVnaW9uIFwiSW1wb3J0c1wiXHJcbi8vLzxyZWZlcmVuY2UgdHlwZXM9XCIuLi9GVURHRS9Db3JlL0J1aWxkL0Z1ZGdlQ29yZS5qc1wiLz5cclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0FpZC9CdWlsZC9GdWRnZUFpZC5qc1wiLz5cclxuLy8jZW5kcmVnaW9uIFwiSW1wb3J0c1wiXHJcblxyXG5uYW1lc3BhY2UgR2FtZSB7XHJcbiAgICBleHBvcnQgZW51bSBHQU1FU1RBVEVTIHtcclxuICAgICAgICBQTEFZSU5HLFxyXG4gICAgICAgIFBBVVNFXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkiA9IEZ1ZGdlQ29yZTtcclxuICAgIGV4cG9ydCBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiRG9tRWxlbWVudHNcIlxyXG4gICAgZXhwb3J0IGxldCBjYW52YXM6IEhUTUxDYW52YXNFbGVtZW50ID0gPEhUTUxDYW52YXNFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ2FudmFzXCIpO1xyXG4gICAgLy8gd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIGluaXQpO1xyXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoXCJsb2FkXCIsIHN0YXJ0KTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJhbmdlZFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTWVsZWVcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIHBsYXllckNob2ljZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuICAgIGV4cG9ydCBsZXQgZ2FtZXN0YXRlOiBHQU1FU1RBVEVTID0gR0FNRVNUQVRFUy5QQVVTRTtcclxuICAgIGV4cG9ydCBsZXQgdmlld3BvcnQ6IMaSLlZpZXdwb3J0ID0gbmV3IMaSLlZpZXdwb3J0KCk7XHJcbiAgICBleHBvcnQgbGV0IGNtcENhbWVyYTogxpIuQ29tcG9uZW50Q2FtZXJhID0gbmV3IMaSLkNvbXBvbmVudENhbWVyYSgpO1xyXG4gICAgZXhwb3J0IGxldCBncmFwaDogxpIuTm9kZSA9IG5ldyDGki5Ob2RlKFwiR3JhcGhcIik7XHJcblxyXG4gICAgdmlld3BvcnQuaW5pdGlhbGl6ZShcIlZpZXdwb3J0XCIsIGdyYXBoLCBjbXBDYW1lcmEsIGNhbnZhcyk7XHJcblxyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIxOiBQbGF5ZXIuUGxheWVyO1xyXG4gICAgZXhwb3J0IGxldCBhdmF0YXIyOiBQbGF5ZXIuUGxheWVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgIGV4cG9ydCBsZXQgbWluaU1hcDogVUkuTWluaW1hcDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvbm5lY3RlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgZXhwb3J0IGxldCBkZWx0YVRpbWU6IG51bWJlcjtcclxuXHJcbiAgICBleHBvcnQgbGV0IHNlcnZlclByZWRpY3Rpb25BdmF0YXI6IE5ldHdvcmtpbmcuU2VydmVyUHJlZGljdGlvbjtcclxuXHJcbiAgICBleHBvcnQgbGV0IGN1cnJlbnROZXRPYmo6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGVudGl0aWVzOiBFbnRpdHkuRW50aXR5W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbWllczogRW5lbXkuRW5lbXlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvb2xEb3duczogQWJpbGl0eS5Db29sZG93bltdID0gW107XHJcbiAgICAvL0pTT05cclxuICAgIGV4cG9ydCBsZXQgZW5lbWllc0pTT046IEVudGl0eS5FbnRpdHlbXTtcclxuICAgIGV4cG9ydCBsZXQgaW50ZXJuYWxJdGVtSlNPTjogSXRlbXMuSW50ZXJuYWxJdGVtW107XHJcbiAgICBleHBvcnQgbGV0IGJ1ZmZJdGVtSlNPTjogSXRlbXMuQnVmZkl0ZW1bXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGRhbWFnZUJ1ZmZKU09OOiBCdWZmLkRhbWFnZUJ1ZmZbXTtcclxuICAgIGV4cG9ydCBsZXQgYXR0cmlidXRlQnVmZkpTT046IEJ1ZmYuQXR0cmlidXRlc0J1ZmZbXTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHNKU09OOiBCdWxsZXRzLkJ1bGxldFtdO1xyXG4gICAgZXhwb3J0IGxldCBsb2FkZWQgPSBmYWxzZTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlB1YmxpY1ZhcmlhYmxlc1wiXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcbiAgICBjb25zdCBkYW1wZXI6IG51bWJlciA9IDMuNTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIlByaXZhdGVWYXJpYWJsZXNcIlxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIFwiZXNzZW50aWFsXCJcclxuICAgIGFzeW5jIGZ1bmN0aW9uIGluaXQoKSB7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZVooMjUpO1xyXG4gICAgICAgIGNtcENhbWVyYS5tdHhQaXZvdC5yb3RhdGVZKDE4MCk7XHJcblxyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgLy8gR2VuZXJhdGlvbi5yb29tcyA9IEdlbmVyYXRpb24uZ2VuZXJhdGVOb3JtYWxSb29tcygpO1xyXG4gICAgICAgICAgICBJdGVtcy5JdGVtR2VuZXJhdG9yLmZpbGxQb29sKCk7XHJcbiAgICAgICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnByb2NlZHVhbFJvb21HZW5lcmF0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoIUdlbmVyYXRpb24uZ2VuZXJhdGlvbkZhaWxlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwiR0VORVJBVElPTiBGQUlMRUQgLT4gUkVTVEFSVCBHRU5FUkFUSU9OXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHNlcnZlclByZWRpY3Rpb25BdmF0YXIgPSBuZXcgTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uKG51bGwpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ3JhcGguYXBwZW5kQ2hpbGQoYXZhdGFyMSk7XHJcblxyXG4gICAgICAgIMaSQWlkLmFkZFN0YW5kYXJkTGlnaHRDb21wb25lbnRzKGdyYXBoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgZmluZEdhbWVPYmplY3RzKCk7XHJcbiAgICAgICAgZGVsdGFUaW1lID0gR2FtZS7Gki5Mb29wLnRpbWVGcmFtZUdhbWUgKiAwLjAwMTtcclxuICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLnByZWRpY3QoKTtcclxuICAgICAgICBjYW1lcmFVcGRhdGUoKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhclBvc2l0aW9uKEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uKTtcclxuICAgICAgICAgICAgc2VydmVyUHJlZGljdGlvbkF2YXRhci51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIFVJLnVwZGF0ZVVJKCk7XHJcblxyXG4gICAgICAgIGRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBmaW5kR2FtZU9iamVjdHMoKTogdm9pZCB7XHJcbiAgICAgICAgaXRlbXMgPSA8SXRlbXMuSXRlbVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxJdGVtcy5JdGVtPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLklURU0pO1xyXG4gICAgICAgIGJ1bGxldHMgPSA8QnVsbGV0cy5CdWxsZXRbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8QnVsbGV0cy5CdWxsZXQ+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuQlVMTEVUKTtcclxuICAgICAgICBlbnRpdGllcyA9IDxFbnRpdHkuRW50aXR5W10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoY2hpbGQgPT4gKDxFbnRpdHkuRW50aXR5PmNoaWxkKSBpbnN0YW5jZW9mIEVudGl0eS5FbnRpdHkpO1xyXG4gICAgICAgIGVuZW1pZXMgPSA8RW5lbXkuRW5lbXlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkpO1xyXG4gICAgICAgIGN1cnJlbnRSb29tID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbSA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtKS50YWcgPT0gVGFnLlRBRy5ST09NKSk7XHJcbiAgICAgICAgY3VycmVudE5ldE9iaiA9IHNldE5ldE9iaihncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtID0+IE5ldHdvcmtpbmcuaXNOZXR3b3JrT2JqZWN0KGVsZW0pKSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc2V0TmV0T2JqKF9uZXRPajogR2FtZS7Gki5Ob2RlW10pOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0c1tdIHtcclxuICAgICAgICBsZXQgdGVtcE5ldE9ianM6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10gPSBbXTtcclxuICAgICAgICBfbmV0T2ouZm9yRWFjaChvYmogPT4ge1xyXG4gICAgICAgICAgICB0ZW1wTmV0T2Jqcy5wdXNoKDxJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0cz57IG5ldElkOiBOZXR3b3JraW5nLmdldE5ldElkKG9iaiksIG5ldE9iamVjdE5vZGU6IG9iaiB9KVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIHRlbXBOZXRPYmpzO1xyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gc2V0Q2xpZW50KCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQucmVhZHlTdGF0ZSA9PSBOZXR3b3JraW5nLmNsaWVudC5zb2NrZXQuT1BFTiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZFJvb20udG9Mb3dlckNhc2UoKSAhPSBcImxvYmJ5XCIpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyBzZXRDbGllbnQoKSB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiByZWFkeVNhdGUoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0Q2xpZW50UmVhZHkoKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHsgcmVhZHlTYXRlKCkgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnRMb29wKCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCAhPSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5sb2FkZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKEdhbWUubG9hZGVkKSB7XHJcbiAgICAgICAgICAgIMaSLkxvb3Auc3RhcnQoxpIuTE9PUF9NT0RFLlRJTUVfR0FNRSwgZGVsdGFUaW1lKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJVSVwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gc3RhcnQoKSB7XHJcbiAgICAgICAgbG9hZFRleHR1cmVzKCk7XHJcbiAgICAgICAgLy8gbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBhZGQgc3ByaXRlIHRvIGdyYXBoZSBmb3Igc3RhcnRzY3JlZW5cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0R2FtZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgTmV0d29ya2luZy5jb25uZWN0aW5nKCk7XHJcbiAgICAgICAgICAgIGxvYWRKU09OKCk7XHJcblxyXG4gICAgICAgICAgICB3YWl0T25Db25uZWN0aW9uKCk7XHJcbiAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIHdhaXRPbkNvbm5lY3Rpb24oKSB7XHJcbiAgICAgICAgICAgICAgICBzZXRDbGllbnQoKTtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMuZmlsdGVyKGVsZW0gPT4gZWxlbS5yZWFkeSA9PSB0cnVlKS5sZW5ndGggPj0gMiAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIklNSE9TVFwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGF3YWl0IGluaXQoKTtcclxuICAgICAgICAgICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduRW5lbWllcygpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5SRURUSUNLLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgYXZhdGFyMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEVuZW15U3Bhd25lci5zcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbSg1LCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0gsIEVudGl0eS5JRC5PR0VSLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUiwgRW50aXR5LklELlNVTU1PTk9SLCBuZXcgxpIuVmVjdG9yMigzLCAzKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyNyZWdpb24gaW5pdCBJdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IGl0ZW0yID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpdGVtMi5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMigtNSwgMCkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIGxldCBpdGVtMyA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlNDQUxFVVAsIG5ldyDGki5WZWN0b3IyKC0yLCAwKSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB6aXB6YXAgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5URVNUKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gemlwemFwLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKDUsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gemlwemFwLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGdyYXBoLmFwcGVuZENoaWxkKGl0ZW0yKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTMpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3blBsYXllcigpO1xyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbUluZm9zOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IEdlbmVyYXRpb24uZ2V0Q29vcmRzRnJvbVJvb21zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgY29vcmRzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb29tSW5mb3MucHVzaCg8SW50ZXJmYWNlcy5JTWluaW1hcEluZm9zPnsgY29vcmRzOiBjb29yZHNbaV0sIHJvb21UeXBlOiBHZW5lcmF0aW9uLnJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzID09IGNvb3Jkc1tpXSkucm9vbVR5cGUgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtaW5pTWFwID0gbmV3IFVJLk1pbmltYXAocm9vbUluZm9zKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZ3JhcGguYWRkQ2hpbGQobWluaU1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgc3RhcnRMb29wKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQod2FpdE9uQ29ubmVjdGlvbiwgMzAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIE5ldHdvcmtpbmcuY3JlYXRlUm9vbSk7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSm9pblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJvb21JZDogc3RyaW5nID0gKDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUm9vbVwiKSkudmFsdWU7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmpvaW5Sb29tKHJvb21JZCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdXBkYXRlUm9vbXMoKTtcclxuICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHdhaXRGb3JMb2JieSgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudHMubGVuZ3RoID4gMSAmJiBOZXR3b3JraW5nLmNsaWVudC5pZFJvb20udG9Mb2NhbGVMb3dlckNhc2UoKSAhPSBcImxvYmJ5XCIpIHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tSWRcIikucGFyZW50RWxlbWVudC5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJMb2JieXNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgY29ubmVjdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHdhaXRGb3JMb2JieSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0sIDIwMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGFzeW5jIGZ1bmN0aW9uIHVwZGF0ZVJvb21zKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5yZWFkeVN0YXRlID09IE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5PUEVOKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5nZXRSb29tcygpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHVwZGF0ZVJvb21zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDcmVkaXRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrQ3JlZGl0XCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBsYXllckNob2ljZShfZTogRXZlbnQpIHtcclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiUmFuZ2VkXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuUmFuZ2VkKEVudGl0eS5JRC5SQU5HRUQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcygxMDAwMCwgNSwgNSwgMSwgMiwgNSwgMSwgODApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKCg8SFRNTEJ1dHRvbkVsZW1lbnQ+X2UudGFyZ2V0KS5pZCA9PSBcIk1lbGVlXCIpIHtcclxuICAgICAgICAgICAgYXZhdGFyMSA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMoMTAwMDAsIDEsIDUsIDEsIDIsIDEwLCAxLCA4MCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgIHJlYWR5U2F0ZSgpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBwYXVzZUNoZWNrKCkge1xyXG4gICAgICAgIGlmICgod2luZG93LnNjcmVlblggPCAtd2luZG93LnNjcmVlbi5hdmFpbFdpZHRoKSAmJiAod2luZG93LnNjcmVlblkgPCAtd2luZG93LnNjcmVlbi5hdmFpbEhlaWdodCkpIHtcclxuICAgICAgICAgICAgcGF1c2UodHJ1ZSwgZmFsc2UpO1xyXG5cclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBwYXVzZUNoZWNrKCk7XHJcbiAgICAgICAgICAgIH0sIDEwMCk7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgcGxheWluZyh0cnVlLCBmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwYXVzZShfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc2V0R2FtZXN0YXRlKGZhbHNlKTtcclxuICAgICAgICAgICAgfSBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYmFjayA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQmFja09wdGlvblwiKTtcclxuICAgICAgICAgICAgICAgIGxldCBiYWNrQ2xvbmUgPSBiYWNrLmNsb25lTm9kZSh0cnVlKTtcclxuXHJcbiAgICAgICAgICAgICAgICBiYWNrLnBhcmVudE5vZGUucmVwbGFjZUNoaWxkKGJhY2tDbG9uZSwgYmFjayk7XHJcblxyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgICAgICAgICDGki5Mb29wLnN0b3AoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBsYXlpbmcoX3N5bmM6IGJvb2xlYW4sIF90cmlnZ2VyT3B0aW9uOiBib29sZWFuKSB7XHJcbiAgICAgICAgaWYgKGdhbWVzdGF0ZSA9PSBHQU1FU1RBVEVTLlBBVVNFKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF90cmlnZ2VyT3B0aW9uKSB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBnYW1lc3RhdGUgPSBHQU1FU1RBVEVTLlBMQVlJTkc7XHJcbiAgICAgICAgICAgIMaSLkxvb3AuY29udGludWUoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgYXN5bmMgZnVuY3Rpb24gbG9hZEpTT04oKSB7XHJcbiAgICAgICAgY29uc3QgbG9hZEVuZW15ID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvRW5lbWllc1N0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGVuZW1pZXNKU09OID0gKDxFbnRpdHkuRW50aXR5W10+bG9hZEVuZW15LmVuZW1pZXMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkSXRlbSA9IGF3YWl0IChhd2FpdCBmZXRjaChcIi4vUmVzb3VyY2VzL0l0ZW1TdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBpbnRlcm5hbEl0ZW1KU09OID0gKDxJdGVtcy5JbnRlcm5hbEl0ZW1bXT5sb2FkSXRlbS5pbnRlcm5hbEl0ZW1zKTtcclxuICAgICAgICBidWZmSXRlbUpTT04gPSAoPEl0ZW1zLkJ1ZmZJdGVtW10+bG9hZEl0ZW0uYnVmZkl0ZW1zKTtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRCdWxsZXRzID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvQnVsbGV0U3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgYnVsbGV0c0pTT04gPSAoPEJ1bGxldHMuQnVsbGV0W10+bG9hZEJ1bGxldHMuc3RhbmRhcmRCdWxsZXRzKTtcclxuXHJcbiAgICAgICAgY29uc3QgbG9hZEJ1ZmZzID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvQnVmZlN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGRhbWFnZUJ1ZmZKU09OID0gKDxCdWZmLkRhbWFnZUJ1ZmZbXT5sb2FkQnVmZnMuZGFtYWdlQnVmZik7XHJcbiAgICAgICAgYXR0cmlidXRlQnVmZkpTT04gPSAoPEJ1ZmYuQXR0cmlidXRlc0J1ZmZbXT5sb2FkQnVmZnMuYXR0cmlidXRlQnVmZik7XHJcblxyXG4gICAgICAgIGNvbnNvbGUud2FybihcImFsbCBKU09OIGxvYWRlZFwiKTtcclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRUZXh0dXJlcygpIHtcclxuICAgICAgICBhd2FpdCBHZW5lcmF0aW9uLnR4dFN0YXJ0Um9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUm9vbXMvbWFwMDEucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBCdWxsZXRzLmJ1bGxldFR4dC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUHJvamVjdGlsZXMvYXJyb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMud2F0ZXJCYWxsVHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Qcm9qZWN0aWxlcy93YXRlckJhbGwucG5nXCIpXHJcblxyXG4gICAgICAgIC8vVUlcclxuICAgICAgICBhd2FpdCBVSS50eHRaZXJvLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE9uZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUb3cubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGhyZWUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0Rm91ci5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU0LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGaXZlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNpeC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU2LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRTZXZlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU3LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRFaWdodC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGU4LnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHROaW5lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTkucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRlbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUxMC5wbmdcIik7XHJcblxyXG4gICAgICAgIC8vVUkgcGFydGljbGVcclxuICAgICAgICBhd2FpdCBVSS5oZWFsUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9oZWFsaW5nLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5wb2lzb25QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3BvaXNvbi5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYnVyblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5ibGVlZGluZ1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvYmxlZWRpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnNsb3dQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL3Nsb3cucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmltbXVuZVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvaW1tdW5lLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgVUkuY29tbW9uUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvY29tbW9uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5yYXJlUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvcmFyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuZXBpY1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2VwaWMucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmxlZ2VuZGFyeVBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvUmFyaXR5L2xlZ2VuZGFyeS5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICBhd2FpdCBFbnRpdHkudHh0U2hhZG93LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvc2hhZG93LnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9NaW5pbWFwXHJcbiAgICAgICAgYXdhaXQgVUkubm9ybWFsUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9ub3JtYWwucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmNoYWxsZW5nZVJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvY2hhbGxlbmdlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5tZXJjaGFudFJvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvbWVyY2hhbnQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnRyZWFzdXJlUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC90cmVhc3VyZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuYm9zc1Jvb20ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL01pbmltYXAvYm9zcy5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICAvL0VORU1ZXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRCYXRJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL2JhdC9iYXRJZGxlLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRSZWRUaWNrSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy90aWNrL3JlZFRpY2tJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFJlZFRpY2tXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3RpY2svcmVkVGlja1dhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNtYWxsVGlja0lkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc21hbGxUaWNrL3NtYWxsVGlja0lkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U21hbGxUaWNrV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zbWFsbFRpY2svc21hbGxUaWNrV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U2tlbGV0b25JZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NrZWxldG9uL3NrZWxldG9uSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTa2VsZXRvbldhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc2tlbGV0b24vc2tlbGV0b25XYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJJZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlcldhbGsucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlckF0dGFjay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9vZ2VyL29nZXJBdHRhY2sucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFN1bW1vbmVySWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zdW1tb25lci9zdW1tb25lcklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U3VtbW9uZXJTdW1tb24ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3VtbW9uZXIvc3VtbW9uZXJTbWFzaC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTdW1tb25lclRlbGVwb3J0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3N1bW1vbmVyL3N1bW1vbmVyVGVsZXBvcnQucG5nXCIpO1xyXG5cclxuXHJcblxyXG5cclxuICAgICAgICAvL0l0ZW1zXHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SWNlQnVja2V0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9pY2VCdWNrZXQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dERtZ1VwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9kYW1hZ2VVcC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0SGVhbHRoVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2hlYWx0aFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRTcGVlZFVwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy9zcGVlZFVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRUb3hpY1JlbGF0aW9uc2hpcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvdG94aWNSZWxhdGlvbnNoaXAucG5nXCIpO1xyXG5cclxuXHJcbiAgICAgICAgQW5pbWF0aW9uR2VuZXJhdGlvbi5nZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKTtcclxuXHJcbiAgICAgICAgLy9UT0RPOiBVU0UgVEhJU1xyXG4gICAgICAgIC8vIGNvbnNvbGUuY2xlYXIoKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBkcmF3KCk6IHZvaWQge1xyXG4gICAgICAgIHZpZXdwb3J0LmRyYXcoKTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FtZXJhVXBkYXRlKCkge1xyXG4gICAgICAgIGxldCBkaXJlY3Rpb24gPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UoYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShkZWx0YVRpbWUgKiBkYW1wZXIpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGRpcmVjdGlvbi5zY2FsZShhdmF0YXIxLmNsaWVudC5taW5UaW1lQmV0d2VlblRpY2tzICogZGFtcGVyKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMygtZGlyZWN0aW9uLngsIGRpcmVjdGlvbi55LCAwKSwgdHJ1ZSk7XHJcbiAgICAgICAgbWluaU1hcC5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi54ICsgbWluaU1hcC5vZmZzZXRYLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24ueSArIG1pbmlNYXAub2Zmc2V0WSwgMCk7XHJcbiAgICB9XHJcblxyXG4gICAgxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKMaSLkVWRU5ULkxPT1BfRlJBTUUsIHVwZGF0ZSk7XHJcbiAgICAvLyNlbmRyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG5cclxufVxyXG4iLCJuYW1lc3BhY2UgVUkge1xyXG4gICAgLy9sZXQgZGl2VUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiVUlcIik7XHJcbiAgICBsZXQgcGxheWVyMVVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjFcIik7XHJcbiAgICBsZXQgcGxheWVyMlVJOiBIVE1MRGl2RWxlbWVudCA9IDxIVE1MRGl2RWxlbWVudD5kb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlBsYXllcjJcIik7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKCkge1xyXG4gICAgICAgIC8vQXZhdGFyMSBVSVxyXG4gICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMVVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgIHVwZGF0ZUludlVJKEdhbWUuYXZhdGFyMS5pdGVtcywgcGxheWVyMVVJKTtcclxuXHJcbiAgICAgICAgLy9BdmF0YXIyIFVJXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgICg8SFRNTERpdkVsZW1lbnQ+cGxheWVyMlVJLnF1ZXJ5U2VsZWN0b3IoXCIjSFBcIikpLnN0eWxlLndpZHRoID0gKEdhbWUuYXZhdGFyMi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAvIEdhbWUuYXZhdGFyMi5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDEwMCkgKyBcIiVcIjtcclxuXHJcbiAgICAgICAgICAgIC8vSW52ZW50b3J5VUlcclxuICAgICAgICAgICAgdXBkYXRlSW52VUkoR2FtZS5hdmF0YXIyLml0ZW1zLCBwbGF5ZXIyVUkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gdXBkYXRlSW52VUkoX2ludjogSXRlbXMuSXRlbVtdLCBfdWk6IEhUTUxFbGVtZW50KSB7XHJcbiAgICAgICAgICAgIF91aS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCByZW1vdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgX2ludi5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjLnNwbGl0KFwiL1wiKS5maW5kKGVsZW0gPT4gZWxlbSA9PSBpbWdOYW1lW2ltZ05hbWUubGVuZ3RoIC0gMV0pICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVtb3ZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICBpZiAocmVtb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaW1nRWxlbWVudC5wYXJlbnRFbGVtZW50LnJlbW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIF9pbnYuZm9yRWFjaCgoZWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGV4c2lzdDogYm9vbGVhbiA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5pbWdTcmMgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zZWFyY2ggRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF91aS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5xdWVyeVNlbGVjdG9yQWxsKFwiaW1nXCIpLmZvckVhY2goKGltZ0VsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbWdOYW1lID0gZWxlbWVudC5pbWdTcmMuc3BsaXQoXCIvXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGltZ0VsZW1lbnQuc3JjLnNwbGl0KFwiL1wiKS5maW5kKGVsZW0gPT4gZWxlbSA9PSBpbWdOYW1lW2ltZ05hbWUubGVuZ3RoIC0gMV0pICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBleHNpc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL25vbmUgZXhzaXN0aW5nIERPTUltZyBmb3IgSXRlbVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghZXhzaXN0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdEaXY6IEhUTUxEaXZFbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGl2LmNsYXNzTmFtZSA9IFwidG9vbHRpcFwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEhUTUxJbWFnZUVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW1nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNyYyA9IGVsZW1lbnQuaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXYuYXBwZW5kQ2hpbGQobmV3SXRlbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VG9vbHRpcDogSFRNTFNwYW5FbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcInNwYW5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rvb2x0aXAudGV4dENvbnRlbnQgPSBlbGVtZW50LmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb29sdGlwLmNsYXNzTmFtZSA9IFwidG9vbHRpcHRleHRcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGl2LmFwcGVuZENoaWxkKG5ld1Rvb2x0aXApO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Rvb2x0aXBMYWJlbDogSFRNTFBhcmFncmFwaEVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwicFwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9vbHRpcExhYmVsLnRleHRDb250ZW50ID0gZWxlbWVudC5uYW1lO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb29sdGlwLmluc2VydEFkamFjZW50RWxlbWVudChcImFmdGVyYmVnaW5cIiwgbmV3VG9vbHRpcExhYmVsKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF91aS5xdWVyeVNlbGVjdG9yKFwiI0ludmVudG9yeVwiKS5hcHBlbmRDaGlsZChuZXdEaXYpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0WmVybzogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPbmU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VG93OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRocmVlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dEZvdXI6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rml2ZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTaXg6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2V2ZW46IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RWlnaHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0TmluZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUZW46IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRGFtYWdlVUkgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5VSTtcclxuICAgICAgICB1cDogbnVtYmVyID0gMC4xNTtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMC41ICogNjA7XHJcbiAgICAgICAgcmFuZG9tWDogbnVtYmVyID0gTWF0aC5yYW5kb20oKSAqIDAuMDUgLSBNYXRoLnJhbmRvbSgpICogMC4wNTtcclxuICAgICAgICBhc3luYyBsaWZlc3BhbigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiZGFtYWdlVUlcIik7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKDAuMzMsIDAuMzMsIDAuMzMpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMjUpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJMaXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG10clNvbGlkV2hpdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKF9kYW1hZ2UpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMudXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmVzcGFuKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhc3luYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUobmV3IMaSLlZlY3RvcjModGhpcy5yYW5kb21YLCB0aGlzLnVwLCAwKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxlKMaSLlZlY3RvcjMuT05FKDEuMDEpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGxvYWRUZXh0dXJlKF9kYW1hZ2U6IG51bWJlcikge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcbiAgICAgICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG5cclxuICAgICAgICAgICAgb2xkQ29tQ29hdCA9IHRoaXMuZ2V0Q29tcG9uZW50KMaSLkNvbXBvbmVudE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAoTWF0aC5hYnMoX2RhbWFnZSkpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgMDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRaZXJvO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE9uZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUb3c7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDM6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGhyZWU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDQ6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0Rm91cjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNTpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGaXZlO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA2OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFNldmVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA3OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA4OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEVpZ2h0O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA5OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dE5pbmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDEwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRlbjtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kYW1hZ2UgPj0gMCkge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcInJlZFwiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIG5ld0NvYXQuY29sb3IgPSDGki5Db2xvci5DU1MoXCJncmVlblwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMudXAgPSAwLjE7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IGhlYWxQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBwb2lzb25QYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBidXJuUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgYmxlZWRpbmdQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBzbG93UGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgaW1tdW5lUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNvbW1vblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHJhcmVQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBlcGljUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgbGVnZW5kYXJ5UGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUGFydGljbGVzIGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIHtcclxuICAgICAgICBpZDogQnVmZi5CVUZGSUQgfCBJdGVtcy5SQVJJVFk7XHJcbiAgICAgICAgYW5pbWF0aW9uUGFydGljbGVzOiBHYW1lLsaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVOdW1iZXI6IG51bWJlcjtcclxuICAgICAgICBwYXJ0aWNsZWZyYW1lUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIHdpZHRoOiBudW1iZXI7XHJcbiAgICAgICAgaGVpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCdWZmLkJVRkZJRCB8IEl0ZW1zLlJBUklUWSwgX3RleHR1cmU6IEdhbWUuxpIuVGV4dHVyZUltYWdlLCBfZnJhbWVDb3VudDogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoQnVmZi5CVUZGSURbX2lkXS50b0xvd2VyQ2FzZSgpKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyID0gX2ZyYW1lQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMucGFydGljbGVmcmFtZVJhdGUgPSBfZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvblBhcnRpY2xlcyA9IG5ldyBHYW1lLsaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKEJ1ZmYuQlVGRklEW19pZF0udG9Mb3dlckNhc2UoKSwgbmV3IMaSLkNvYXRUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgX3RleHR1cmUpKVxyXG4gICAgICAgICAgICB0aGlzLmhlaWdodCA9IF90ZXh0dXJlLmltYWdlLmhlaWdodDtcclxuICAgICAgICAgICAgdGhpcy53aWR0aCA9IF90ZXh0dXJlLmltYWdlLndpZHRoIC8gdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25QYXJ0aWNsZXMuZ2VuZXJhdGVCeUdyaWQoxpIuUmVjdGFuZ2xlLkdFVCgwLCAwLCB0aGlzLndpZHRoLCB0aGlzLmhlaWdodCksIHRoaXMucGFydGljbGVmcmFtZU51bWJlciwgMzIsIMaSLk9SSUdJTjJELkNFTlRFUiwgxpIuVmVjdG9yMi5YKHRoaXMud2lkdGgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24odGhpcy5hbmltYXRpb25QYXJ0aWNsZXMpO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lcmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMDAxKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFRhZyB7XHJcbiAgICBleHBvcnQgZW51bSBUQUcge1xyXG4gICAgICAgIFBMQVlFUixcclxuICAgICAgICBFTkVNWSxcclxuICAgICAgICBCVUxMRVQsXHJcbiAgICAgICAgSVRFTSxcclxuICAgICAgICBST09NLFxyXG4gICAgICAgIFdBTEwsXHJcbiAgICAgICAgRE9PUixcclxuICAgICAgICBPQlNUSUNBTCxcclxuICAgICAgICBVSVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVudGl0eSB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVudGl0eSBleHRlbmRzIEdhbWUuxpJBaWQuTm9kZVNwcml0ZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudEFuaW1hdGlvblN0YXRlOiBBTklNQVRJT05TVEFURVM7XHJcbiAgICAgICAgcHJpdmF0ZSBwZXJmb3JtS25vY2tiYWNrOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgbmV0T2JqZWN0Tm9kZTogxpIuTm9kZSA9IHRoaXM7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgcHVibGljIGF0dHJpYnV0ZXM6IEF0dHJpYnV0ZXM7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICBwdWJsaWMgaXRlbXM6IEFycmF5PEl0ZW1zLkl0ZW0+ID0gW107XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb247XHJcbiAgICAgICAgcHVibGljIGJ1ZmZzOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRDb2xsaWRlclg6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0Q29sbGlkZXJZOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyU2NhbGVGYWt0b3I6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY2FuTW92ZVg6IGJvb2xlYW4gPSB0cnVlO1xyXG4gICAgICAgIHByb3RlY3RlZCBjYW5Nb3ZlWTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgcHJvdGVjdGVkIG1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFuaW1hdGlvbkNvbnRhaW5lcjogQW5pbWF0aW9uR2VuZXJhdGlvbi5BbmltYXRpb25Db250YWluZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGlkbGVTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50S25vY2tiYWNrOiDGki5WZWN0b3IzID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgcHVibGljIHNoYWRvdzogU2hhZG93O1xyXG5cclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihnZXROYW1lQnlJZChfaWQpKTtcclxuICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuSWRNYW5hZ2VyKF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcyA9IG5ldyBBdHRyaWJ1dGVzKDEsIDEsIDEsIDEsIDEsIDEsIDEsIDEpO1xyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclggPSAwO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpLCAodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMikgKiB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IsIHRoaXMubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYW5pID0gQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hbmltYXRpb25Db250YWluZXIgPSBhbmk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlkbGVTY2FsZSA9IGFuaS5zY2FsZS5maW5kKGFuaW1hdGlvbiA9PiBhbmltYXRpb25bMF0gPT0gXCJpZGxlXCIpWzFdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93ID0gbmV3IFNoYWRvdyh0aGlzKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5hZGRDaGlsZCh0aGlzLnNoYWRvdyk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUJ1ZmZzKCk7XHJcbiAgICAgICAgICAgIHRoaXMuc2hhZG93LnVwZGF0ZVNoYWRvd1BvcygpO1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVTY2FsZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLnVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFJhZGl1cygodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMikgKiB0aGlzLmNvbGxpZGVyU2NhbGVGYWt0b3IpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArICh0aGlzLm9mZnNldENvbGxpZGVyWCAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy54KSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJZICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlQnVmZnMoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJ1ZmZzLmxlbmd0aCA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1ZmZzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1ZmZzW2ldLmRvQnVmZlN0dWZmKHRoaXMpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY29sbGlkZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gdHJ1ZTtcclxuICAgICAgICAgICAgbGV0IHdhbGxzOiBHZW5lcmF0aW9uLldhbGxbXSA9IEdhbWUuY3VycmVudFJvb20ud2FsbHM7XHJcbiAgICAgICAgICAgIGxldCB3YWxsQ29sbGlkZXJzOiBHYW1lLsaSLlJlY3RhbmdsZVtdID0gW107XHJcbiAgICAgICAgICAgIHdhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB3YWxsQ29sbGlkZXJzLnB1c2goZWxlbS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGxldCBtZXdEaXJlY3Rpb24gPSBfZGlyZWN0aW9uLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoIW1ld0RpcmVjdGlvbi5lcXVhbHMoR2FtZS7Gki5WZWN0b3IzLlpFUk8oKSkpIHtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIG1ld0RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUNvbGxpc2lvbih3YWxsQ29sbGlkZXJzLCBtZXdEaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNhbGN1bGF0ZUNvbGxpc2lvbihfY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyW10gfCBHYW1lLsaSLlJlY3RhbmdsZVtdLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIF9jb2xsaWRlci5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIENvbGxpZGVyLkNvbGxpZGVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUJlZm9yZU1vdmUgPSBpbnRlcnNlY3Rpb247XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCB0aGlzLmNvbGxpZGVyLmdldFJhZGl1cyArIGVsZW1lbnQuZ2V0UmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9kaXJlY3Rpb24ueCwgMClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgX2RpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQub3duZXJOZXRJZCA9PSBHYW1lLmF2YXRhcjEubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuZ2V0S25vY2tiYWNrKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5vd25lck5ldElkID09IEdhbWUuYXZhdGFyMi5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcua25vY2tiYWNrUHVzaCh0aGlzLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoZWxlbWVudCBpbnN0YW5jZW9mIEdhbWUuxpIuUmVjdGFuZ2xlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbi5oZWlnaHQgKiBpbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkUG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKHRoaXMuY29sbGlkZXIucG9zaXRpb24ueCwgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKF9kaXJlY3Rpb24ueCwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIF9kaXJlY3Rpb24ueSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnRyYW5zZm9ybSjGki5NYXRyaXgzeDMuVFJBTlNMQVRJT04obmV3RGlyZWN0aW9uKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYXJlYUFmdGVyTW92ZSA9IG5ld0ludGVyc2VjdGlvbi5oZWlnaHQgKiBuZXdJbnRlcnNlY3Rpb24ud2lkdGg7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IGFyZWFBZnRlck1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIGRvZXMgRGFtYWdlIHRvIHRoZSBFbnRpdHlcclxuICAgICAgICAgKiBAcGFyYW0gX3ZhbHVlIHZhbHVlIGhvdyBtdWNoIGRhbWFnZSBpcyBhcHBsaWVkXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3ZhbHVlICE9IG51bGwgJiYgdGhpcy5hdHRyaWJ1dGVzLmhpdGFibGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaGl0VmFsdWUgPSB0aGlzLmdldERhbWFnZVJlZHVjdGlvbihfdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gaGl0VmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXcgVUkuRGFtYWdlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZVVJKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIE1hdGgucm91bmQoaGl0VmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiB0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCB0eXBlOiBBVFRSSUJVVEVUWVBFLkhFQUxUSFBPSU5UUyB9LCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUVudGl0eSh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRpZSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGllKCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBnZXREYW1hZ2VSZWR1Y3Rpb24oX3ZhbHVlOiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gX3ZhbHVlICogKDEgLSAodGhpcy5hdHRyaWJ1dGVzLmFybW9yIC8gMTAwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI3JlZ2lvbiBrbm9ja2JhY2tcclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMucGVyZm9ybUtub2NrYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtS25vY2tiYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfcG9zaXRpb24udG9WZWN0b3IyKCkpLnRvVmVjdG9yMygwKTtcclxuICAgICAgICAgICAgICAgIGxldCBrbm9ja0JhY2tTY2FsaW5nOiBudW1iZXIgPSBHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zY2FsZTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKF9rbm9ja2JhY2tGb3JjZSAqIGtub2NrQmFja1NjYWxpbmcpO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEtub2NrYmFjay5hZGQoZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJlZHVjZUtub2NrYmFjaygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrLnNjYWxlKDAuNSk7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKHRoaXMuY3VycmVudEtub2NrYmFjay5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50S25vY2tiYWNrLm1hZ25pdHVkZSA8IDAuMDAwMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMucGVyZm9ybUtub2NrYmFjayA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgICAgICBwdWJsaWMgc3dpdGNoQW5pbWF0aW9uKF9uYW1lOiBBTklNQVRJT05TVEFURVMpIHtcclxuICAgICAgICAgICAgbGV0IG5hbWU6IHN0cmluZyA9IEFOSU1BVElPTlNUQVRFU1tfbmFtZV0udG9Mb3dlckNhc2UoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyICE9IG51bGwgJiYgPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0gIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlICE9IF9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChfbmFtZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuSURMRTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5XQUxLOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuV0FMSztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5TVU1NT047XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBBTklNQVRJT05TVEFURVMuQVRUQUNLOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuQVRUQUNLO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5URUxFUE9SVDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLlRFTEVQT1JUO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gdGhpcy5hbmltYXRpb25Db250YWluZXIuZnJhbWVSYXRlLmZpbmQob2JqID0+IG9ialswXSA9PSBuYW1lKVsxXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEZyYW1lRGlyZWN0aW9uKDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QW5pbWF0aW9uU3RhdGUodGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS53YXJuKFwibm8gYW5pbWF0aW9uQ29udGFpbmVyIG9yIGFuaW1hdGlvbiB3aXRoIG5hbWU6IFwiICsgbmFtZSArIFwiIGF0IEVudGl0eTogXCIgKyB0aGlzLm5hbWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZW51bSBBTklNQVRJT05TVEFURVMge1xyXG4gICAgICAgIElETEUsIFdBTEssIFNVTU1PTiwgQVRUQUNLLCBURUxFUE9SVFxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJFSEFWSU9VUiB7XHJcbiAgICAgICAgSURMRSwgRk9MTE9XLCBGTEVFLCBTVU1NT04sIEFUVEFDS1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBlbnVtIElEIHtcclxuICAgICAgICBSQU5HRUQsXHJcbiAgICAgICAgTUVMRUUsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgQkFULFxyXG4gICAgICAgIFJFRFRJQ0ssXHJcbiAgICAgICAgU01BTExUSUNLLFxyXG4gICAgICAgIFNLRUxFVE9OLFxyXG4gICAgICAgIE9HRVIsXHJcbiAgICAgICAgU1VNTU9OT1JcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0TmFtZUJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBzdHJpbmcge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuUkFOR0VEOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmFuZ2VkXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuTUVMRUU6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJ0YW5rXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwiYmF0XCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInJlZFRpY2tcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJzbWFsbFRpY2tcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNrZWxldG9uXCI7XHJcbiAgICAgICAgICAgIGNhc2UgSUQuT0dFUjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcIm9nZXJcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInN1bW1vbm9yXCI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBFTkVNWUNMQVNTIHtcclxuICAgICAgICBFTkVNWURVTUIsXHJcbiAgICAgICAgRU5FTVlEQVNILFxyXG4gICAgICAgIEVORU1ZU01BU0gsXHJcbiAgICAgICAgRU5FTVlQQVRST0wsXHJcbiAgICAgICAgRU5FTVlTSE9PVCxcclxuICAgICAgICBTVU1NT05PUixcclxuICAgICAgICBTVU1NT05PUkFERFNcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJBaWQgPSBGdWRnZUFpZDtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXkgZXh0ZW5kcyBFbnRpdHkuRW50aXR5IGltcGxlbWVudHMgSW50ZXJmYWNlcy5JS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgY3VycmVudEJlaGF2aW91cjogRW50aXR5LkJFSEFWSU9VUjtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjI7XHJcbiAgICAgICAgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBmbG9ja2luZzogRmxvY2tpbmdCZWhhdmlvdXI7XHJcbiAgICAgICAgaXNBZ2dyZXNzaXZlOiBib29sZWFuO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLkVORU1ZO1xyXG4gICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICBsZXQgcmVmID0gR2FtZS5lbmVtaWVzSlNPTi5maW5kKGVuZW15ID0+IGVuZW15Lm5hbWUgPT0gRW50aXR5LklEW19pZF0udG9Mb3dlckNhc2UoKSlcclxuICAgICAgICAgICAgY29uc29sZS5sb2cocmVmKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbmV3IEVudGl0eS5BdHRyaWJ1dGVzKHJlZi5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgcmVmLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCByZWYuYXR0cmlidXRlcy5zcGVlZCwgcmVmLmF0dHJpYnV0ZXMuc2NhbGUsIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCByZWYuYXR0cmlidXRlcy5hcm1vciwgcmVmLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHJlZi5hdHRyaWJ1dGVzLmFjY3VyYWN5KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwLjEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgxpIuVmVjdG9yMyh0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlclggPSByZWYub2Zmc2V0Q29sbGlkZXJYO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWSA9IHJlZi5vZmZzZXRDb2xsaWRlclk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciA9IHJlZi5jb2xsaWRlclNjYWxlRmFrdG9yO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIChyZWYub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAocmVmLm9mZnNldENvbGxpZGVyWSAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSksICgodGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggKiB0aGlzLmlkbGVTY2FsZSkgLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZUJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMubW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVuZW15UG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vICg8UGxheWVyLlBsYXllcj5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZSwgX3Bvc2l0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbi5hZGQoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQWdncmVzc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24uc3VidHJhY3QoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIG1vdmVTaW1wbGUoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIHJldHVybiBkaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZUF3YXkoX3RhcmdldDogxpIuVmVjdG9yMik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgbW92ZVNpbXBsZSA9IHRoaXMubW92ZVNpbXBsZShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgbW92ZVNpbXBsZS54ICo9IC0xO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnkgKj0gLTE7XHJcbiAgICAgICAgICAgIHJldHVybiBtb3ZlU2ltcGxlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRpZSgpIHtcclxuICAgICAgICAgICAgc3VwZXIuZGllKCk7XHJcbiAgICAgICAgICAgIEdhbWUuY3VycmVudFJvb20uZW5lbXlDb3VudE1hbmFnZXIub25FbmVteURlYXRoKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlkZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGxldCBrbm9ja2JhY2sgPSB0aGlzLmN1cnJlbnRLbm9ja2JhY2suY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChrbm9ja2JhY2subWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJkaXJlY3Rpb246IFwiICsga25vY2tiYWNrLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uYWRkKGtub2NrYmFjayk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAgICAgICAgICAgICBrbm9ja2JhY2suc2NhbGUoKEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgIHN1cGVyLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGF2YXRhcjogUGxheWVyLlBsYXllcltdID0gKDxQbGF5ZXIuUGxheWVyW10+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihlbGVtZW50ID0+ICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpKTtcclxuICAgICAgICAgICAgICAgIGxldCBhdmF0YXJDb2xsaWRlcnM6IENvbGxpZGVyLkNvbGxpZGVyW10gPSBbXTtcclxuICAgICAgICAgICAgICAgIGF2YXRhci5mb3JFYWNoKChlbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXZhdGFyQ29sbGlkZXJzLnB1c2goKDxQbGF5ZXIuUGxheWVyPmVsZW0pLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlzaW9uKGF2YXRhckNvbGxpZGVycywgX2RpcmVjdGlvbik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAodGhpcy5jYW5Nb3ZlWCAmJiAhdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCF0aGlzLmNhbk1vdmVYICYmIHRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zdWJ0cmFjdChrbm9ja2JhY2spO1xyXG4gICAgICAgICAgICAgICAgaWYgKGtub2NrYmFjay5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJrbm9ja2JhY2s6IFwiICsga25vY2tiYWNrLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coXCJkaXJlY3Rpb246IFwiICsgX2RpcmVjdGlvbi5tYWduaXR1ZGUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICB0aGlzLnJlZHVjZUtub2NrYmFjaygpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15RHVtYiBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBwdWJsaWMgZmxvY2tpbmc6IEZsb2NraW5nQmVoYXZpb3VyID0gbmV3IEZsb2NraW5nQmVoYXZpb3VyKHRoaXMsIDIsIDIsIDAuMSwgMSwgMSwgMSwgMCwgMSk7XHJcbiAgICAgICAgcHJpdmF0ZSBhZ2dyZXNzaXZlRGlzdGFuY2U6IG51bWJlciA9IDMgKiAzO1xyXG4gICAgICAgIHByaXZhdGUgc3RhbWluYTogQWJpbGl0eS5Db29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDE4MCk7XHJcbiAgICAgICAgcHJpdmF0ZSByZWNvdmVyOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNjApO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3BvczogR2FtZS7Gki5WZWN0b3IyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3MsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIC8vVE9ETzogdGFsayB3aXRoIHRvYmlcclxuICAgICAgICAgICAgdGhpcy5zdGFtaW5hLm9uRW5kQ29vbERvd24gPSAoKSA9PiB0aGlzLnJlY292ZXJTdGFtO1xyXG4gICAgICAgIH1cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NraW5nLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAvL1RPRE86IHNldCB0byAzIGFmdGVyIHRlc3RpbmdcclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgdGhpcy5hZ2dyZXNzaXZlRGlzdGFuY2UpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5pc0FnZ3Jlc3NpdmUgJiYgIXRoaXMucmVjb3Zlci5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgcmVjb3ZlclN0YW0gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMucmVjb3Zlci5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5zdGFtaW5hLmhhc0Nvb2xEb3duICYmICF0aGlzLnJlY292ZXIuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFtaW5hLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc3RhbWluYS5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBzZXQgYSBjYWxsYmFjayBmdW5jdGlvbiB0byBkbyB0aGlzLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiAodGhpcy5zdGFtaW5hLmdldEN1cnJlbnRDb29sZG93biA9PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLnJlY292ZXIuc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlTbWFzaCBleHRlbmRzIEVuZW15IHtcclxuICAgICAgICBjb29sRG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDUpO1xyXG4gICAgICAgIGF2YXRhcnM6IFBsYXllci5QbGF5ZXJbXSA9IFtdO1xyXG4gICAgICAgIHJhbmRvbVBsYXllciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcbiAgICAgICAgY3VycmVudEJlaGF2aW91cjogRW50aXR5LkJFSEFWSU9VUiA9IEVudGl0eS5CRUhBVklPVVIuSURMRTtcclxuXHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXTtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXJzW3RoaXMucmFuZG9tUGxheWVyXSkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPT0gRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0sgJiYgdGhpcy5nZXRDdXJyZW50RnJhbWUgPj0gKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW1wiYXR0YWNrXCJdKS5mcmFtZXMubGVuZ3RoIC0gMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDQgJiYgIXRoaXMuY29vbERvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0s7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY29vbERvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50QmVoYXZpb3VyICE9IEVudGl0eS5CRUhBVklPVVIuSURMRSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIgIT0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1cpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlU2ltcGxlKHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5BVFRBQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5BVFRBQ0spO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHByb3RlY3RlZCBkYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCAxMiwgMSwgNSAqIDYwLCAzKTtcclxuICAgICAgICBsYXN0TW92ZURpcmVjaXRvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRhc2hDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW10gPSBbXTtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMywgMC44LCAxLjUsIDEsIDEsIDAuMSwgMCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSAoPFBsYXllci5QbGF5ZXI+dGhpcy5hdmF0YXJzW3RoaXMucmFuZG9tUGxheWVyXSkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZVNxdWFyZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5oYXNDb29sZG93bigpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTWF0aC5yYW5kb20oKSAqIDEwMCA8IDAuMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm1vdmVEaXJlY3Rpb24ubWFnbml0dWRlU3F1YXJlZCA+IDAuMDAwNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5sYXN0TW92ZURpcmVjaXRvbiA9IHRoaXMubW92ZURpcmVjdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GTEVFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gdGhpcy5tb3ZlQXdheSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15UGF0cm9sIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHBhdHJvbFBvaW50czogxpIuVmVjdG9yMltdID0gW25ldyDGki5WZWN0b3IyKDAsIDQpLCBuZXcgxpIuVmVjdG9yMig1LCAwKV07XHJcbiAgICAgICAgd2FpdFRpbWU6IG51bWJlciA9IDEwMDA7XHJcbiAgICAgICAgY3VycmVuUG9pbnRJbmRleDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5wYXRyb2woKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHBhdHJvbCgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoxpIuVmVjdG9yMy5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XS50b1ZlY3RvcjMoKSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbikpID4gMC4zKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUoKMaSLlZlY3RvcjIuU1VNKHRoaXMucGF0cm9sUG9pbnRzW3RoaXMuY3VycmVuUG9pbnRJbmRleF0sIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW5Qb2ludEluZGV4ICsgMSA8IHRoaXMucGF0cm9sUG9pbnRzLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlblBvaW50SW5kZXgrKztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSwgdGhpcy53YWl0VGltZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNob290IGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHZpZXdSYWRpdXM6IG51bWJlciA9IDM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDYwLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1RBTkRBUkQsIDIsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmIChkaXN0YW5jZSA8IDkgJiYgdGhpcy5pc0FnZ3Jlc3NpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zaG9vdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNob290KF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgX2RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoMCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlIDwgMyB8fCB0aGlzLmlzQWdncmVzc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCB0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3JBZGRzIGV4dGVuZHMgRW5lbXlEYXNoIHtcclxuICAgICAgICBhdmF0YXI6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX3RhcmdldDogUGxheWVyLlBsYXllciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhciA9IF90YXJnZXQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMywgMC44LCAxLjUsIDEsIDEsIDAuMSwgMCk7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IHRoaXMuYXZhdGFyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKGRpc3RhbmNlIDwgMykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NraW5nLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG5cclxuICAgIC8vIGV4cG9ydCBjbGFzcyBFbmVteUNpcmNsZSBleHRlbmRzIEVuZW15IHtcclxuICAgIC8vICAgICBkaXN0YW5jZTogbnVtYmVyID0gNTtcclxuXHJcbiAgICAvLyAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZywgX3Byb3BlcnRpZXM6IFBsYXllci5DaGFyYWN0ZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgLy8gICAgICAgICBzdXBlcihfbmFtZSwgX3Byb3BlcnRpZXMsIF9wb3NpdGlvbik7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBtb3ZlKCk6IHZvaWQge1xyXG4gICAgLy8gICAgICAgICBzdXBlci5tb3ZlKCk7XHJcbiAgICAvLyAgICAgICAgIHRoaXMubW92ZUNpcmNsZSgpO1xyXG4gICAgLy8gICAgIH1cclxuXHJcbiAgICAvLyAgICAgbGlmZXNwYW4oX2dyYXBoOiDGki5Ob2RlKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLmxpZmVzcGFuKF9ncmFwaCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBhc3luYyBtb3ZlQ2lyY2xlKCkge1xyXG4gICAgLy8gICAgICAgICB0aGlzLnRhcmdldCA9IENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgY29uc29sZS5sb2codGhpcy50YXJnZXQpO1xyXG4gICAgLy8gICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAvLyAgICAgICAgIC8vIGxldCBkaXN0YW5jZVBsYXllcjIgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLnBsYXllcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgaWYgKGRpc3RhbmNlUGxheWVyMSA+IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIHRoaXMubW92ZVNpbXBsZSgpO1xyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgICAgIGVsc2Uge1xyXG4gICAgLy8gICAgICAgICAgICAgbGV0IGRlZ3JlZSA9IENhbGN1bGF0aW9uLmNhbGNEZWdyZWUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMudGFyZ2V0KVxyXG4gICAgLy8gICAgICAgICAgICAgbGV0IGFkZCA9IDA7XHJcblxyXG4gICAgLy8gICAgICAgICAgICAgLy8gd2hpbGUgKGRpc3RhbmNlUGxheWVyMSA8PSB0aGlzLmRpc3RhbmNlKSB7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIElucHV0U3lzdGVtLmNhbGNQb3NpdGlvbkZyb21EZWdyZWUoZGVncmVlICsgYWRkLCB0aGlzLmRpc3RhbmNlKS50b1ZlY3RvcjMoMCkpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLnNjYWxlKCgxIC8gR2FtZS5mcmFtZVJhdGUgKiB0aGlzLnByb3BlcnRpZXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShkaXJlY3Rpb24sIHRydWUpO1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gICAgIGFkZCArPSA1O1xyXG4gICAgLy8gICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgIC8vICAgICAgICAgfVxyXG4gICAgLy8gICAgIH1cclxuICAgIC8vIH1cclxufSIsIm5hbWVzcGFjZSBJbnRlcmZhY2VzIHtcclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVNwYXduYWJsZSB7XHJcbiAgICAgICAgbGlmZXRpbWU/OiBudW1iZXI7XHJcbiAgICAgICAgZGVzcGF3bigpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtub2NrYmFja2FibGUge1xyXG4gICAgICAgIGRvS25vY2tiYWNrKF9ib2R5OiBFbnRpdHkuRW50aXR5KTogdm9pZDtcclxuICAgICAgICBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKTogdm9pZDtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElLaWxsYWJsZSB7XHJcbiAgICAgICAgb25EZWF0aCgpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSURhbWFnZWFibGUge1xyXG4gICAgICAgIGdldERhbWFnZSgpOiB2b2lkO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJQXR0cmlidXRlVmFsdWVQYXlsb2FkIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyIHwgYm9vbGVhbjtcclxuICAgICAgICB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElOZXR3b3JrYWJsZSB7XHJcbiAgICAgICAgbmV0SWQ6IG51bWJlcjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElOZXR3b3JrT2JqZWN0cyB7XHJcbiAgICAgICAgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBuZXRPYmplY3ROb2RlOiBHYW1lLsaSLk5vZGU7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSW5wdXRCdWxsZXRQYXlsb2FkIHtcclxuICAgICAgICB0aWNrOiBudW1iZXI7XHJcbiAgICAgICAgaW5wdXRWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJSW5wdXRBdmF0YXJQYXlsb2FkIHtcclxuICAgICAgICB0aWNrOiBudW1iZXI7XHJcbiAgICAgICAgaW5wdXRWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMztcclxuICAgICAgICBkb2VzQWJpbGl0eTogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElTdGF0ZVBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIGV4cG9ydCBpbnRlcmZhY2UgQnVsbGV0SW5mb3JtYXRpb24ge1xyXG4gICAgLy8gICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAvLyAgICAgaGl0UG9pbnQ6IG51bWJlcjtcclxuICAgIC8vICAgICBsaWZlVGltZTogbnVtYmVyO1xyXG4gICAgLy8gICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAvLyAgICAgcGFzc3Rocm91Z2hFbmVteTogbnVtYmVyO1xyXG4gICAgLy8gICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyAgICAgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyAgICAgcm90YXRpb25EZWc6IG51bWJlcjtcclxuICAgIC8vICAgICBob21pbmdUYXJnZXQ/OiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAvLyB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJUm9vbUV4aXRzIHtcclxuICAgICAgICBub3J0aDogYm9vbGVhbjtcclxuICAgICAgICBlYXN0OiBib29sZWFuO1xyXG4gICAgICAgIHNvdXRoOiBib29sZWFuO1xyXG4gICAgICAgIHdlc3Q6IGJvb2xlYW47XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJUm9vbSB7XHJcbiAgICAgICAgY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICByb29tU2l6ZTogbnVtYmVyO1xyXG4gICAgICAgIGV4aXRzOiBJUm9vbUV4aXRzO1xyXG4gICAgICAgIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgICAgIHRyYW5zbGF0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJTWluaW1hcEluZm9zIHtcclxuICAgICAgICBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICByb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRTtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBJdGVtcyB7XHJcbiAgICBleHBvcnQgZW51bSBJVEVNSUQge1xyXG4gICAgICAgIElDRUJVQ0tFVENIQUxMRU5HRSxcclxuICAgICAgICBETUdVUCxcclxuICAgICAgICBTUEVFRFVQLFxyXG4gICAgICAgIFBST0pFQ1RJTEVTVVAsXHJcbiAgICAgICAgSEVBTFRIVVAsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV04sXHJcbiAgICAgICAgQVJNT1JVUCxcclxuICAgICAgICBIT01FQ09NSU5HLFxyXG4gICAgICAgIFRPWElDUkVMQVRJT05TSElQLFxyXG4gICAgICAgIFZBTVBZLFxyXG4gICAgICAgIFNMT1dZU0xPVyxcclxuICAgICAgICBUSE9SU0hBTU1FUixcclxuICAgICAgICBHRVRTVFJPTktPLFxyXG4gICAgICAgIEdFVFdFQUtPLFxyXG4gICAgICAgIFpJUFpBUCxcclxuICAgICAgICBURVNUXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRJY2VCdWNrZXQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0RG1nVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0SGVhbHRoVXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VG94aWNSZWxhdGlvbnNoaXA6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3BlZWRVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgSXRlbSBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuSVRFTTtcclxuICAgICAgICBpZDogSVRFTUlEO1xyXG4gICAgICAgIHB1YmxpYyByYXJpdHk6IFJBUklUWTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgZGVzY3JpcHRpb246IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgaW1nU3JjOiBzdHJpbmc7XHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuICAgICAgICB0cmFuc2Zvcm06IMaSLkNvbXBvbmVudFRyYW5zZm9ybSA9IG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKTtcclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiDGki5WZWN0b3IyOyBnZXQgZ2V0UG9zaXRpb24oKTogxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLnBvc2l0aW9uIH1cclxuICAgICAgICBidWZmOiBCdWZmLkJ1ZmZbXSA9IFtdO1xyXG4gICAgICAgIHByb3RlY3RlZCBjaGFuZ2VkVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihJVEVNSURbX2lkXSk7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMubmV0SWQgPSBOZXR3b3JraW5nLklkTWFuYWdlcihfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKCkpKTtcclxuICAgICAgICAgICAgbGV0IG1hdGVyaWFsOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIndoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChtYXRlcmlhbCkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5idWZmLnB1c2godGhpcy5nZXRCdWZmQnlJZCgpKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRUZXh0dXJlQnlJZCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbnVsbFxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFkZFJhcml0eUJ1ZmYoKSB7XHJcbiAgICAgICAgICAgIGxldCBidWZmID0gbmV3IEJ1ZmYuUmFyaXR5QnVmZih0aGlzLnJhcml0eSk7XHJcbiAgICAgICAgICAgIGJ1ZmYuYWRkVG9JdGVtKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZCeUlkKCk6IEJ1ZmYuQnVmZiB7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wOiBJdGVtcy5CdWZmSXRlbSA9IGdldEJ1ZmZJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5QT0lTT04pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuQkxFRURJTkcpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0xPV1lTTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCdWZmLmdldEJ1ZmZCeUlkKEJ1ZmYuQlVGRklELlNMT1cpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuR0VUU1RST05LTzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5TQ0FMRVVQKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkdFVFdFQUtPOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCdWZmLmdldEJ1ZmZCeUlkKEJ1ZmYuQlVGRklELlNDQUxFRE9XTik7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgbG9hZFRleHR1cmUoX3RleHR1cmU6IMaSLlRleHR1cmVJbWFnZSk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgIG5ld1R4dCA9IF90ZXh0dXJlO1xyXG4gICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIGxldCBuZXdNdHI6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibXRyXCIsIMaSLlNoYWRlckZsYXRUZXh0dXJlZCwgbmV3Q29hdCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHNldFRleHR1cmVCeUlkKCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELklDRUJVQ0tFVENIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEljZUJ1Y2tldCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5ETUdVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dERtZ1VwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRTcGVlZFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuUFJPSkVDVElMRVNVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5sb2FkVGV4dHVyZSh0eHRIZWFsdGhVcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkhPTUVDT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5UT1hJQ1JFTEFUSU9OU0hJUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dFRveGljUmVsYXRpb25zaGlwKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlZBTVBZOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICB0aGlzLnBvc2l0aW9uID0gX3Bvc2l0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gX3Bvc2l0aW9uLnRvVmVjdG9yMygwLjAxKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5zZXRQb3NpdGlvbihfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgc3Bhd24oKTogdm9pZCB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25JdGVtKHRoaXMuaWQsIHRoaXMucG9zaXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVJdGVtKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIF9hdmF0YXIuaXRlbXMucHVzaCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyByZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBJbnRlcm5hbEl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNob29zZW5PbmVOZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogSVRFTUlELCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICBjb25zdCBpdGVtID0gZ2V0SW50ZXJuYWxJdGVtQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgaWYgKGl0ZW0gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5hbWUgPSBpdGVtLm5hbWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnZhbHVlID0gaXRlbS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGVzY3JpcHRpb24gPSBpdGVtLmRlc2NyaXB0aW9uO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSBpdGVtLmltZ1NyYztcclxuICAgICAgICAgICAgICAgIHRoaXMucmFyaXR5ID0gaXRlbS5yYXJpdHk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkUmFyaXR5QnVmZigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldENob29zZW5PbmVOZXRJZChfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNob29zZW5PbmVOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRJdGVtVG9FbnRpdHkoX2F2YXRhcjogUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICBzdXBlci5hZGRJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhciwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGVzcGF3bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuc2V0QXR0cmlidXRlc0J5SWQoX2F2YXRhciwgZmFsc2UpO1xyXG4gICAgICAgICAgICBfYXZhdGFyLml0ZW1zLnNwbGljZShfYXZhdGFyLml0ZW1zLmluZGV4T2YoX2F2YXRhci5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSB0aGlzLmlkKSksIDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEludGVybmFsSXRlbSh0aGlzLmlkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyOiBQbGF5ZXIuUGxheWVyLCBfYWRkOiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSUNFQlVDS0VUQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhbmdlZFZhbHVlID0gX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uIC0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiArPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5DT09MRE9XTlJFRFVDVElPTiB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkRNR1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgKz0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzIC09IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNQRUVEVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TUEVFRCB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlBST0pFQ1RJTEVTVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgLT0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSEVBTFRIVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW1vdW50ID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtIGN1cnJlbnRNYXhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgKz0gYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLT0gdGhpcy5jaGFuZ2VkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjdXJyZW50TWF4UG9pbnRzID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFtb3VudCA9IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMgLSBjdXJyZW50TWF4UG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC09IGFtb3VudDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLk1BWEhFQUxUSFBPSU5UUyB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TQ0FMRURPV046XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5BUk1PUlVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciAtPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuYXJtb3IsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkFSTU9SIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5SYW5nZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5IT01JTkc7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5haW1UeXBlID0gV2VhcG9ucy5BSU0uTk9STUFMO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImNvb2xkb3duVGltZVwiLCBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5nZXRNYXhDb29sRG93bi50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImFpbVR5cGVcIiwgV2VhcG9ucy5BSU1bX2F2YXRhci53ZWFwb24uYWltVHlwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiYnVsbGV0VHlwZVwiLCBCdWxsZXRzLkJVTExFVFRZUEVbX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiLCBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50LnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9IDEwMCAqIDYwO1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5OT1JNQUw7XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUjtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ID0gMTtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5jYW5TaG9vdCA9IHRydWU7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlpJUFpBUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogQnVsbGV0cy5aaXBaYXBPYmplY3QgPSBuZXcgQnVsbGV0cy5aaXBaYXBPYmplY3QoX2F2YXRhci5uZXRJZCwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgemlwemFwID0gPEJ1bGxldHMuWmlwWmFwT2JqZWN0PkdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGl0ZW0gPT4gKDxCdWxsZXRzLlppcFphcE9iamVjdD5pdGVtKS50eXBlID09IEJ1bGxldHMuQlVMTEVUVFlQRS5aSVBaQVApO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB6aXB6YXAuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRFU1Q6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3IEFiaWxpdHkuQXJlYU9mRWZmZWN0KEFiaWxpdHkuQU9FVFlQRS5IRUFMVEhVUCwgbnVsbCkuYWRkVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgKDxBYmlsaXR5LkFyZWFPZkVmZmVjdD5fYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPEFiaWxpdHkuQXJlYU9mRWZmZWN0PmNoaWxkKS5pZCA9PSBBYmlsaXR5LkFPRVRZUEUuSEVBTFRIVVApKS5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWZmSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlcjtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgbGV0IHRlbXAgPSBnZXRCdWZmSXRlbUJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgIHRoaXMubmFtZSA9IHRlbXAubmFtZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IHRlbXAudmFsdWU7XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSB0ZW1wLnRpY2tSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gdGVtcC5kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5pbWdTcmMgPSB0ZW1wLmltZ1NyYztcclxuICAgICAgICAgICAgdGhpcy5yYXJpdHkgPSB0ZW1wLnJhcml0eTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkUmFyaXR5QnVmZigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgYWRkSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWRkSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEJ1ZmZCeUlkKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBCdWZmSXRlbSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQnVmZkl0ZW0odGhpcy5pZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWZmQnlJZChfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVE9YSUNSRUxBVElPTlNISVA6XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0J1ZmYgPSB0aGlzLmJ1ZmYuZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gQnVmZi5CVUZGSUQuUE9JU09OKS5jbG9uZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYuZHVyYXRpb24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgKDxCdWZmLkRhbWFnZUJ1ZmY+bmV3QnVmZikudmFsdWUgPSAwLjU7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5hZGRUb0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRJbnRlcm5hbEl0ZW1CeUlkKF9pZDogSVRFTUlEKTogSXRlbXMuSW50ZXJuYWxJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5pbnRlcm5hbEl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEJ1ZmZJdGVtQnlJZChfaWQ6IElURU1JRCk6IEl0ZW1zLkJ1ZmZJdGVtIHtcclxuICAgICAgICByZXR1cm4gR2FtZS5idWZmSXRlbUpTT04uZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gX2lkKTtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEl0ZW1HZW5lcmF0b3Ige1xyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGl0ZW1Qb29sOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZmlsbFBvb2woKSB7XHJcbiAgICAgICAgICAgIEdhbWUuaW50ZXJuYWxJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oaXRlbS5pZCkpXHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICBHYW1lLmJ1ZmZJdGVtSlNPTi5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtUG9vbC5wdXNoKG5ldyBCdWZmSXRlbShpdGVtLmlkKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtKCk6IEl0ZW1zLkl0ZW0ge1xyXG4gICAgICAgICAgICBsZXQgcG9zc2libGVJdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIHBvc3NpYmxlSXRlbXMgPSB0aGlzLmdldFBvc3NpYmxlSXRlbXMoKTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICAvLyB0aGlzLml0ZW1Qb29sLnNwbGljZSh0aGlzLml0ZW1Qb29sLmluZGV4T2YocmV0dXJuSXRlbSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXRpYyBnZXRSYW5kb21JdGVtQnlSYXJpdHkoX3Jhcml0eTogUkFSSVRZKTogSXRlbXMuSXRlbSB7XHJcbiAgICAgICAgICAgIGxldCBwb3NzaWJsZUl0ZW1zID0gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBfcmFyaXR5KTtcclxuICAgICAgICAgICAgbGV0IHJhbmRvbUluZGV4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHBvc3NpYmxlSXRlbXMubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICBsZXQgcmV0dXJuSXRlbSA9IHBvc3NpYmxlSXRlbXNbcmFuZG9tSW5kZXhdO1xyXG4gICAgICAgICAgICByZXR1cm4gcmV0dXJuSXRlbS5jbG9uZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UG9zc2libGVJdGVtcygpOiBJdGVtcy5JdGVtW10ge1xyXG4gICAgICAgICAgICBsZXQgY2hvc2VuUmFyaXR5OiBSQVJJVFkgPSB0aGlzLmdldFJhcml0eSgpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKGNob3NlblJhcml0eSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuQ09NTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5DT01NT04pO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuUkFSRSk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5FUElDOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IFJBUklUWS5FUElDKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLkxFR0VOREFSWTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuTEVHRU5EQVJZKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPSBSQVJJVFkuQ09NTU9OKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdGF0aWMgZ2V0UmFyaXR5KCk6IFJBUklUWSB7XHJcbiAgICAgICAgICAgIGxldCByYXJpdHlOdW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApO1xyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkNPTU1PTjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocmFyaXR5TnVtYmVyID49IDIwICYmIHJhcml0eU51bWJlciA8IDUwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLlJBUkU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA+PSA1ICYmIHJhcml0eU51bWJlciA8IDIwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkVQSUM7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA8IDUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBSQVJJVFkuTEVHRU5EQVJZO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBSQVJJVFkuQ09NTU9OO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBSQVJJVFkge1xyXG4gICAgICAgIENPTU1PTixcclxuICAgICAgICBSQVJFLFxyXG4gICAgICAgIEVQSUMsXHJcbiAgICAgICAgTEVHRU5EQVJZXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQW5pbWF0aW9uR2VuZXJhdGlvbiB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFJlZFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNtYWxsVGlja1dhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dEJhdElkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dFNrZWxldG9uSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTa2VsZXRvbldhbGs6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9nZXJBdHRhY2s6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTdW1tb25lcklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJTdW1tb246IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJUZWxlcG9ydDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgaW1wb3J0IMaSQWlkID0gRnVkZ2VBaWQ7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEFuaW1hdGlvbkNvbnRhaW5lciB7XHJcbiAgICAgICAgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBhbmltYXRpb25zOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbnMgPSB7fTtcclxuICAgICAgICBzY2FsZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgZnJhbWVSYXRlOiBbc3RyaW5nLCBudW1iZXJdW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLmdldEFuaW1hdGlvbkJ5SWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgYWRkQW5pbWF0aW9uKF9hbmk6IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uLCBfc2NhbGU6IG51bWJlciwgX2ZyYW1lUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uc1tfYW5pLm5hbWVdID0gX2FuaTtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZS5wdXNoKFtfYW5pLm5hbWUsIF9zY2FsZV0pO1xyXG4gICAgICAgICAgICB0aGlzLmZyYW1lUmF0ZS5wdXNoKFtfYW5pLm5hbWUsIF9mcmFtZVJhdGVdKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEFuaW1hdGlvbkJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuQkFUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKGJhdElkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBiYXRJZGxlLmFuaW1hdGlvblNjYWxlLCBiYXRJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ocmVkVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCByZWRUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgcmVkVGlja1dhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrSWRsZS5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNtYWxsVGlja1dhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzbWFsbFRpY2tXYWxrLmFuaW1hdGlvblNjYWxlLCBzbWFsbFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TS0VMRVRPTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbklkbGUuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbklkbGUuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHNrZWxldG9uV2Fsay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNrZWxldG9uV2Fsay5hbmltYXRpb25TY2FsZSwgc2tlbGV0b25XYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcklkbGUuYW5pbWF0aW9uU2NhbGUsIG9nZXJJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBvZ2VyV2Fsay5hbmltYXRpb25TY2FsZSwgb2dlcldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VyQXR0YWNrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlckF0dGFjay5hbmltYXRpb25TY2FsZSwgb2dlckF0dGFjay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJJZGxlLmFuaW1hdGlvblNjYWxlLCBzdW1tb25lcklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lcldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lcldhbGsuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVyU3VtbW9uLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJTdW1tb24uYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyU3VtbW9uLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJUZWxlcG9ydC5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVyVGVsZXBvcnQuYW5pbWF0aW9uU2NhbGUsIHN1bW1vbmVyVGVsZXBvcnQuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY2xhc3MgTXlBbmltYXRpb25DbGFzcyB7XHJcbiAgICAgICAgcHVibGljIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uTmFtZTogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBzcHJpdGVTaGVldDogxpIuVGV4dHVyZUltYWdlO1xyXG4gICAgICAgIGFtb3VudE9mRnJhbWVzOiBudW1iZXI7XHJcbiAgICAgICAgZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbjtcclxuICAgICAgICBhbmltYXRpb25TY2FsZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX2FuaW1hdGlvbk5hbWU6IHN0cmluZywgX3RleHR1cmU6IMaSLlRleHR1cmVJbWFnZSwgX2Ftb3VudE9mRnJhbWVzOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlciwpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hbmltYXRpb25OYW1lID0gX2FuaW1hdGlvbk5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlU2hlZXQgPSBfdGV4dHVyZTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUgPSBfZnJhbWVSYXRlO1xyXG4gICAgICAgICAgICB0aGlzLmFtb3VudE9mRnJhbWVzID0gX2Ftb3VudE9mRnJhbWVzO1xyXG4gICAgICAgICAgICBnZW5lcmF0ZUFuaW1hdGlvbkZyb21HcmlkKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9UT0RPOiBnZXQgYW5pbWF0aW9uIHNjYWxlXHJcbiAgICB9XHJcblxyXG4gICAgLy8jcmVnaW9uIHNwcml0ZVNoZWV0XHJcbiAgICBsZXQgYmF0SWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgcmVkVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgcmVkVGlja1dhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHNtYWxsVGlja0lkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc21hbGxUaWNrV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc2tlbGV0b25JZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHNrZWxldG9uV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgb2dlcklkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlcldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgb2dlckF0dGFjazogTXlBbmltYXRpb25DbGFzcztcclxuXHJcbiAgICBsZXQgc3VtbW9uZXJJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHN1bW1vbmVyV2FsazogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclN1bW1vbjogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lclRlbGVwb3J0OiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIC8vI3JlZ2lvbiBBbmltYXRpb25Db250YWluZXJcclxuICAgIGxldCBiYXRBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCByZWRUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc21hbGxUaWNrQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc2tlbGV0b25BbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIGxldCBvZ2VyQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgc3VtbW9uZXJBbmltYXRpb246IEFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZW5lcmF0ZUFuaW1hdGlvbk9iamVjdHMoKSB7XHJcblxyXG4gICAgICAgIGJhdElkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuQkFULCBcImlkbGVcIiwgdHh0QmF0SWRsZSwgNCwgMTIpO1xyXG5cclxuICAgICAgICByZWRUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcImlkbGVcIiwgdHh0UmVkVGlja0lkbGUsIDYsIDEyKTtcclxuICAgICAgICByZWRUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5SRURUSUNLLCBcIndhbGtcIiwgdHh0UmVkVGlja1dhbGssIDQsIDE2KTtcclxuXHJcbiAgICAgICAgc21hbGxUaWNrSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwiaWRsZVwiLCB0eHRTbWFsbFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc21hbGxUaWNrV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TTUFMTFRJQ0ssIFwid2Fsa1wiLCB0eHRTbWFsbFRpY2tXYWxrLCA0LCAxMik7XHJcblxyXG4gICAgICAgIHNrZWxldG9uSWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJpZGxlXCIsIHR4dFNrZWxldG9uSWRsZSwgNSwgMTIpO1xyXG4gICAgICAgIHNrZWxldG9uV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TS0VMRVRPTiwgXCJ3YWxrXCIsIHR4dFNrZWxldG9uV2FsaywgNywgMTIpO1xyXG5cclxuICAgICAgICBvZ2VySWRsZSA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImlkbGVcIiwgdHh0T2dlcklkbGUsIDUsIDYpO1xyXG4gICAgICAgIG9nZXJXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELk9HRVIsIFwid2Fsa1wiLCB0eHRPZ2VyV2FsaywgNiwgNik7XHJcbiAgICAgICAgb2dlckF0dGFjayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcImF0dGFja1wiLCB0eHRPZ2VyQXR0YWNrLCAxMCwgMTIpO1xyXG5cclxuICAgICAgICBzdW1tb25lcklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwiaWRsZVwiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lcldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwid2Fsa1wiLCB0eHRTdW1tb25lcklkbGUsIDYsIDEyKTtcclxuICAgICAgICBzdW1tb25lclN1bW1vbiA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJzdW1tb25cIiwgdHh0U3VtbW9uZXJTdW1tb24sIDEzLCAxMik7XHJcbiAgICAgICAgc3VtbW9uZXJUZWxlcG9ydCA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5TVU1NT05PUiwgXCJ0ZWxlcG9ydFwiLCB0eHRTdW1tb25lclRlbGVwb3J0LCA2LCAxMik7XHJcblxyXG5cclxuXHJcbiAgICAgICAgYmF0QW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuQkFUKTtcclxuICAgICAgICByZWRUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuUkVEVElDSyk7XHJcbiAgICAgICAgc21hbGxUaWNrQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU01BTExUSUNLKTtcclxuICAgICAgICBza2VsZXRvbkFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNLRUxFVE9OKTtcclxuICAgICAgICBvZ2VyQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuT0dFUik7XHJcbiAgICAgICAgc3VtbW9uZXJBbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TVU1NT05PUik7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldEFuaW1hdGlvbkJ5SWQoX2lkOiBFbnRpdHkuSUQpOiBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgIHJldHVybiBiYXRBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlJFRFRJQ0s6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gcmVkVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU01BTExUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNtYWxsVGlja0FuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc2tlbGV0b25BbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELk9HRVI6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gb2dlckFuaW1hdGlvbjtcclxuICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gc3VtbW9uZXJBbmltYXRpb247XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRQaXhlbFJhdGlvKF93aWR0aDogbnVtYmVyLCBfaGVpZ2h0OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCBtYXggPSBNYXRoLm1heChfd2lkdGgsIF9oZWlnaHQpO1xyXG4gICAgICAgIGxldCBtaW4gPSBNYXRoLm1pbihfd2lkdGgsIF9oZWlnaHQpO1xyXG5cclxuICAgICAgICBsZXQgc2NhbGUgPSAxIC8gbWF4ICogbWluO1xyXG4gICAgICAgIHJldHVybiBzY2FsZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZChfY2xhc3M6IE15QW5pbWF0aW9uQ2xhc3MpIHtcclxuICAgICAgICBsZXQgY2xyV2hpdGU6IMaSLkNvbG9yID0gxpIuQ29sb3IuQ1NTKFwid2hpdGVcIik7XHJcbiAgICAgICAgbGV0IGNvYXRlZFNwcml0ZVNoZWV0OiDGki5Db2F0VGV4dHVyZWQgPSBuZXcgxpIuQ29hdFRleHR1cmVkKGNscldoaXRlLCBfY2xhc3Muc3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIGxldCB3aWR0aDogbnVtYmVyID0gX2NsYXNzLnNwcml0ZVNoZWV0LnRleEltYWdlU291cmNlLndpZHRoIC8gX2NsYXNzLmFtb3VudE9mRnJhbWVzO1xyXG4gICAgICAgIGxldCBoZWlnaHQ6IG51bWJlciA9IF9jbGFzcy5zcHJpdGVTaGVldC50ZXhJbWFnZVNvdXJjZS5oZWlnaHQ7XHJcbiAgICAgICAgbGV0IGNyZWF0ZWRBbmltYXRpb246IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uID0gbmV3IMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uKF9jbGFzcy5hbmltYXRpb25OYW1lLCBjb2F0ZWRTcHJpdGVTaGVldCk7XHJcbiAgICAgICAgY3JlYXRlZEFuaW1hdGlvbi5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHdpZHRoLCBoZWlnaHQpLCBfY2xhc3MuYW1vdW50T2ZGcmFtZXMsIDMyLCDGki5PUklHSU4yRC5DRU5URVIsIMaSLlZlY3RvcjIuWCh3aWR0aCkpO1xyXG4gICAgICAgIF9jbGFzcy5hbmltYXRpb25TY2FsZSA9IGdldFBpeGVsUmF0aW8od2lkdGgsIGhlaWdodCk7XHJcbiAgICAgICAgX2NsYXNzLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiA9IGNyZWF0ZWRBbmltYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxufVxyXG5cclxuIiwibmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCB0aW1lcjogbnVtYmVyID0gMDtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudFRpY2s6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHVibGljIG1pblRpbWVCZXR3ZWVuVGlja3M6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgZ2FtZVRpY2tSYXRlOiBudW1iZXIgPSA2Mi41O1xyXG4gICAgICAgIHByb3RlY3RlZCBidWZmZXJTaXplOiBudW1iZXIgPSAxMDI0O1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBHYW1lLsaSLk5vZGUgeyByZXR1cm4gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkubmV0T2JqZWN0Tm9kZSB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3RhdGVCdWZmZXI6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZFtdO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWluVGltZUJldHdlZW5UaWNrcyA9IDEgLyB0aGlzLmdhbWVUaWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KF9pbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9Ly8jcmVnaW9uICBidWxsZXQgUHJlZGljdGlvblxyXG4gICAgYWJzdHJhY3QgY2xhc3MgQnVsbGV0UHJlZGljdGlvbiBleHRlbmRzIFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0PnRoaXMub3duZXI7XHJcbiAgICAgICAgICAgIGJ1bGxldC5tb3ZlKGNsb25lSW5wdXRWZWN0b3IpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogYnVsbGV0Lm10eExvY2FsLnRyYW5zbGF0aW9uIH1cclxuICAgICAgICAgICAgcmV0dXJuIG5ld1N0YXRlUGF5bG9hZDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNlcnZlckJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBCdWxsZXRQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dEJ1ZmZlcjogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkW107XHJcbiAgICAgICAgcHJpdmF0ZSBsYXRlc3RTZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgbGFzdFByb2Nlc3NlZFN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBmbHlEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4yO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZseURpcmVjdGlvbiA9ICg8QnVsbGV0cy5CdWxsZXQ+dGhpcy5vd25lcikuZmx5RGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjYW50IGZpbmQgb3duZXJcIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50aW1lciArPSBHYW1lLmRlbHRhVGltZTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMudGltZXIgPj0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRpbWVyIC09IHRoaXMubWluVGltZUJldHdlZW5UaWNrcztcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlVGljaygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50VGljaysrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlICE9IHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IHRoaXMuZmx5RGlyZWN0aW9uIH07XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXJbYnVmZmVySW5kZXhdID0gaW5wdXRQYXlsb2FkO1xyXG4gICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhpbnB1dFBheWxvYWQudGljayArIFwiX19fXCIgKyBpbnB1dFBheWxvYWQuaW5wdXRWZWN0b3IpO1xyXG4gICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZCk7XHJcblxyXG4gICAgICAgICAgICAvL3NlbmQgaW5wdXRQYXlsb2FkIHRvIGhvc3RcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kQnVsbGV0SW5wdXQodGhpcy5vd25lck5ldElkLCBpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uU2VydmVyTW92ZW1lbnRTdGF0ZShfc2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdGVzdFNlcnZlclN0YXRlID0gX3NlcnZlclN0YXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUgPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlcnZlclN0YXRlQnVmZmVySW5kZXggPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbkVycm9yOiBudW1iZXIgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLCB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdLnBvc2l0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbkVycm9yID4gdGhpcy5Bc3luY1RvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKHRoaXMub3duZXIubmFtZSArIFwiIG5lZWQgdG8gYmUgdXBkYXRlZCB0bzogWDpcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueCArIFwiIFk6IFwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aWNrVG9Qcm9jZXNzID0gKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayArIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aWNrVG9Qcm9jZXNzIDwgdGhpcy5jdXJyZW50VGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuICAgIC8vI3JlZ2lvbiAgYXZhdGFyIFByZWNkaWN0aW9uXHJcbiAgICBhYnN0cmFjdCBjbGFzcyBBdmF0YXJQcmVkaWN0aW9uIGV4dGVuZHMgUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBwcm9jZXNzTW92ZW1lbnQoaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIGxldCBjbG9uZUlucHV0VmVjdG9yID0gaW5wdXQuaW5wdXRWZWN0b3IuY2xvbmU7XHJcbiAgICAgICAgICAgIGlmIChjbG9uZUlucHV0VmVjdG9yLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGNsb25lSW5wdXRWZWN0b3Iubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgJiYgaW5wdXQuZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPnRoaXMub3duZXIpLm1vdmUoY2xvbmVJbnB1dFZlY3Rvcik7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1N0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBpbnB1dC50aWNrLCBwb3NpdGlvbjogdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDbGllbnRQcmVkaWN0aW9uIGV4dGVuZHMgQXZhdGFyUHJlZGljdGlvbiB7XHJcblxyXG4gICAgICAgIHByaXZhdGUgaW5wdXRCdWZmZXI6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZFtdO1xyXG4gICAgICAgIHByaXZhdGUgbGF0ZXN0U2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGxhc3RQcm9jZXNzZWRTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgaG9yaXpvbnRhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSB2ZXJ0aWNhbElucHV0OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG5cclxuICAgICAgICBwcml2YXRlIEFzeW5jVG9sZXJhbmNlOiBudW1iZXIgPSAwLjE7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlciA9IG5ldyBBcnJheTxJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQ+KHRoaXMuYnVmZmVyU2l6ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5ob3Jpem9udGFsSW5wdXQgPSBJbnB1dFN5c3RlbS5tb3ZlKCkueDtcclxuICAgICAgICAgICAgdGhpcy52ZXJ0aWNhbElucHV0ID0gSW5wdXRTeXN0ZW0ubW92ZSgpLnk7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSAhPSB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRoaXMuY3VycmVudFRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIHRoaXMuc3dpdGNoQXZhdGFyQWJpbGl0eVN0YXRlKCk7XHJcbiAgICAgICAgICAgIGxldCBpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCA9IHsgdGljazogdGhpcy5jdXJyZW50VGljaywgaW5wdXRWZWN0b3I6IG5ldyDGki5WZWN0b3IzKHRoaXMuaG9yaXpvbnRhbElucHV0LCB0aGlzLnZlcnRpY2FsSW5wdXQsIDApLCBkb2VzQWJpbGl0eTogdGhpcy5kb2VzQWJpbGl0eSB9O1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyW2J1ZmZlckluZGV4XSA9IGlucHV0UGF5bG9hZDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coaW5wdXRQYXlsb2FkLnRpY2sgKyBcIl9fX1wiICsgaW5wdXRQYXlsb2FkLmlucHV0VmVjdG9yLmNsb25lKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpO1xyXG5cclxuICAgICAgICAgICAgLy9zZW5kIGlucHV0UGF5bG9hZCB0byBob3N0XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZENsaWVudElucHV0KHRoaXMub3duZXJOZXRJZCwgaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN3aXRjaEF2YXRhckFiaWxpdHlTdGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKCg8RW50aXR5LkVudGl0eT50aGlzLm93bmVyKS5pZCA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuUmFuZ2VkPnRoaXMub3duZXIpLmRhc2guZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gKDxQbGF5ZXIuTWVsZWU+dGhpcy5vd25lcikuYmxvY2suZG9lc0FiaWxpdHk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgb25TZXJ2ZXJNb3ZlbWVudFN0YXRlKF9zZXJ2ZXJTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgPSBfc2VydmVyU3RhdGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGhhbmRsZVNlcnZlclJlY29uY2lsaWF0aW9uKCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICBsZXQgc2VydmVyU3RhdGVCdWZmZXJJbmRleCA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgbGV0IHBvc2l0aW9uRXJyb3I6IG51bWJlciA9IEdhbWUuxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24sIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0ucG9zaXRpb24pLm1hZ25pdHVkZTtcclxuICAgICAgICAgICAgaWYgKHBvc2l0aW9uRXJyb3IgPiB0aGlzLkFzeW5jVG9sZXJhbmNlKSB7XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJ5b3UgbmVlZCB0byBiZSB1cGRhdGVkIHRvOiBYOlwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi54ICsgXCIgWTogXCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb247XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XSA9IHRoaXMubGF0ZXN0U2VydmVyU3RhdGU7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IHRpY2tUb1Byb2Nlc3MgPSAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICsgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgd2hpbGUgKHRpY2tUb1Byb2Nlc3MgPCB0aGlzLmN1cnJlbnRUaWNrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHN0YXRlUGF5bG9hZDogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQodGhpcy5pbnB1dEJ1ZmZlclt0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IHRpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSBzdGF0ZVBheWxvYWQ7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRpY2tUb1Byb2Nlc3MrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU2VydmVyUHJlZGljdGlvbiBleHRlbmRzIEF2YXRhclByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcml2YXRlIGlucHV0UXVldWU6IFF1ZXVlID0gbmV3IFF1ZXVlKCk7XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVFbnRpdHlUb0NoZWNrKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgaGFuZGxlVGljaygpIHtcclxuXHJcbiAgICAgICAgICAgIGxldCBidWZmZXJJbmRleCA9IC0xO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy5pbnB1dFF1ZXVlLmdldFF1ZXVlTGVuZ3RoKCkgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSA8SW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkPnRoaXMuaW5wdXRRdWV1ZS5kZXF1ZXVlKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgYnVmZmVySW5kZXggPSBpbnB1dFBheWxvYWQudGljayAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KGlucHV0UGF5bG9hZClcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoYnVmZmVySW5kZXggIT0gLTEpIHtcclxuICAgICAgICAgICAgICAgIC8vU2VuZCB0byBjbGllbnQgbmV3IHBvc2l0aW9uXHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRTZXJ2ZXJCdWZmZXIodGhpcy5vd25lck5ldElkLCB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkNsaWVudElucHV0KGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRRdWV1ZS5lbnF1ZXVlKGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuICAgIGNsYXNzIFF1ZXVlIHtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBhbnlbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMgPSBbXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGVucXVldWUoX2l0ZW06IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCB8IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLnB1c2goX2l0ZW0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVxdWV1ZSgpOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgfCBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcy5zaGlmdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0UXVldWVMZW5ndGgoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1zLmxlbmd0aDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1zKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcztcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEFiaWxpdHkge1xyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEFiaWxpdHkge1xyXG4gICAgICAgIHByb3RlY3RlZCBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBjb29sZG93bjogQ29vbGRvd247XHJcbiAgICAgICAgcHJvdGVjdGVkIGFiaWxpdHlDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGR1cmF0aW9uOiBDb29sZG93bjtcclxuICAgICAgICBwdWJsaWMgZG9lc0FiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlciwgX2R1cmF0aW9uOiBudW1iZXIsIF9hYmlsaXR5Q291bnQ6IG51bWJlciwgX2Nvb2xkb3duVGltZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFiaWxpdHlDb3VudCA9IF9hYmlsaXR5Q291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gbmV3IENvb2xkb3duKF9kdXJhdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQ29vbGRvd24oX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUFiaWxpdHkoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZUFiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRvZXNBYmlsaXR5ICYmICF0aGlzLmR1cmF0aW9uLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy9kbyBzdHVmZlxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA9IHRoaXMuYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb29sZG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRvZXNBYmlsaXR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYWN0aXZhdGVBYmlsaXR5KClcclxuICAgICAgICAgICAgICAgIHRoaXMuZHVyYXRpb24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50LS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50YWJpbGl0eUNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgaGFzQ29vbGRvd24oKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLnJlbW92ZUV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQmxvY2sgZXh0ZW5kcyBBYmlsaXR5IHtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmRlYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERhc2ggZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlciwgX3NwZWVkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQsIF9kdXJhdGlvbiwgX2FiaWxpdHlDb3VudCwgX2Nvb2xkb3duVGltZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImFjdGl2YXRlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuc3BlZWQgKj0gdGhpcy5zcGVlZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhcImRlYWN0aXZhdGVcIik7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5oaXRhYmxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLnNwZWVkIC89IHRoaXMuc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTcGF3blN1bW1vbmVycyBleHRlbmRzIEFiaWxpdHkge1xyXG4gICAgICAgIHByaXZhdGUgc3Bhd25SYWRpdXM6IG51bWJlciA9IDE7XHJcbiAgICAgICAgcHJvdGVjdGVkIGFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuYWN0aXZhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIodGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgTWF0aC5yYW5kb20oKSAqIHRoaXMuc3Bhd25SYWRpdXMsIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24ueSArIDIpXHJcbiAgICAgICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKSA+IDAuNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5zcGF3bkJ5SUQoRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFMsIEVudGl0eS5JRC5CQVQsIHBvc2l0aW9uLCBHYW1lLmF2YXRhcjEsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuQkFULCBwb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgY2lyY2xlU2hvb3QgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwdWJsaWMgYnVsbGV0QW1vdW50OiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBidWxsZXRzOiBCdWxsZXRzLkJ1bGxldFtdID0gW107XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldHMgPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1bGxldEFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1bGxldHMucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQoQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJELCB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBHYW1lLsaSLlZlY3RvcjMuWkVSTygpLCB0aGlzLm93bmVyTmV0SWQpKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVsbGV0c1tpXS5tdHhMb2NhbC5yb3RhdGVaKCgzNjAgLyB0aGlzLmJ1bGxldEFtb3VudCAqIGkpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVsbGV0QW1vdW50OyBpKyspIHtcclxuICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcy5idWxsZXRzW2ldKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25CdWxsZXQoV2VhcG9ucy5BSU0uTk9STUFMLCB0aGlzLmJ1bGxldHNbaV0uZGlyZWN0aW9uLCB0aGlzLmJ1bGxldHNbaV0ubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIENvb2xkb3duIHtcclxuICAgICAgICBwdWJsaWMgaGFzQ29vbERvd246IGJvb2xlYW5cclxuICAgICAgICBwcml2YXRlIGNvb2xEb3duOiBudW1iZXI7IGdldCBnZXRNYXhDb29sRG93bigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5jb29sRG93biB9OyBzZXQgc2V0TWF4Q29vbERvd24oX3BhcmFtOiBudW1iZXIpIHsgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlOyB0aGlzLmNvb2xEb3duID0gX3BhcmFtOyB0aGlzLmN1cnJlbnRDb29sZG93biA9IHRoaXMuY29vbERvd247IH1cclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRDb29sZG93bjogbnVtYmVyOyBnZXQgZ2V0Q3VycmVudENvb2xkb3duKCk6IG51bWJlciB7IHJldHVybiB0aGlzLmN1cnJlbnRDb29sZG93biB9O1xyXG4gICAgICAgIHB1YmxpYyBvbkVuZENvb2xEb3duOiAoKSA9PiB2b2lkO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9udW1iZXI6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSBfbnVtYmVyO1xyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhcnRDb29sRG93bigpIHtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IHRydWVcclxuICAgICAgICAgICAgR2FtZS7Gki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5MT09QX0ZSQU1FLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZW5kQ29vbERvd24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLm9uRW5kQ29vbERvd24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9uRW5kQ29vbERvd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmhhc0Nvb2xEb3duID0gZmFsc2U7XHJcbiAgICAgICAgICAgIEdhbWUuxpIuTG9vcC5yZW1vdmVFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuTE9PUF9GUkFNRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZUNvb2xEb3duKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlQ29vbERvd24oKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudENvb2xkb3duID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24tLTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Q29vbGRvd24gPD0gMCAmJiB0aGlzLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmVuZENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRDb29sZG93biA9IHRoaXMuY29vbERvd247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcbiIsIm5hbWVzcGFjZSBBYmlsaXR5IHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBBT0VUWVBFIHtcclxuICAgICAgICBIRUFMVEhVUFxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBBcmVhT2ZFZmZlY3QgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklOZXR3b3JrYWJsZSB7XHJcbiAgICAgICAgcHVibGljIG5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGlkOiBBT0VUWVBFO1xyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFBvc2l0aW9uKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLnBvc2l0aW9uIH07IHNldCBzZXRQb3NpdGlvbihfcG9zOiBHYW1lLsaSLlZlY3RvcjIpIHsgdGhpcy5wb3NpdGlvbiA9IF9wb3MgfTtcclxuICAgICAgICBwcml2YXRlIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjsgZ2V0IGdldENvbGxpZGVyKCk6IENvbGxpZGVyLkNvbGxpZGVyIHsgcmV0dXJuIHRoaXMuY29sbGlkZXIgfTtcclxuICAgICAgICBwcml2YXRlIGR1cmF0aW9uOiBDb29sZG93bjtcclxuICAgICAgICBwcml2YXRlIGFyZWFNYXQ6IEdhbWUuxpIuTWF0ZXJpYWw7XHJcbiAgICAgICAgcHJpdmF0ZSBvd25lck5ldElkOiBudW1iZXI7XHJcblxyXG4gICAgICAgIHByaXZhdGUgYnVmZkxpc3Q6IEJ1ZmYuQnVmZltdOyBnZXQgZ2V0QnVmZkxpc3QoKTogQnVmZi5CdWZmW10geyByZXR1cm4gdGhpcy5idWZmTGlzdCB9O1xyXG4gICAgICAgIHByaXZhdGUgZGFtYWdlVmFsdWU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBBT0VUWVBFLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihBT0VUWVBFW19pZF0udG9Mb3dlckNhc2UoKSk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuSWRNYW5hZ2VyKF9uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uID0gbmV3IENvb2xkb3duKDEyMCk7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24ub25FbmRDb29sRG93biA9IHRoaXMuZGVzcGF3bjtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50TWVzaChuZXcgR2FtZS7Gki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmRhbWFnZVZhbHVlID0gMTtcclxuICAgICAgICAgICAgdGhpcy5hcmVhTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwiYW9lU2hhZGVyXCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCBVSS5jb21tb25QYXJ0aWNsZSkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ID0gbmV3IEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5hcmVhTWF0KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWF0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMyh0aGlzLmNvbGxpZGVyLmdldFJhZGl1cyAqIDIsIHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICogMiwgMSlcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZGVzcGF3biA9ICgpID0+IHtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZXNwYXduXCIpO1xyXG4gICAgICAgICAgICAvL1RPRE86IGZpbmQgcmlnaHQgcGFyZW50IHRvIGNhbmNlbDtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5wb3BJRCh0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzcGF3bihfZW50aXR5OiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIF9lbnRpdHkuYWRkQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlWigwLjAxKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmR1cmF0aW9uLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZFRvRW50aXR5KF9lbnRpdHk6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgdGhpcy5zcGF3bihfZW50aXR5KTtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX2VudGl0eS5uZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IEdhbWUuxpIuTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVudGl0eS5FbnRpdHk+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuRU5FTVkgfHwgKDxFbnRpdHkuRW50aXR5PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKF9jb2xsID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSAoPEVudGl0eS5FbnRpdHk+X2NvbGwpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZW50aXR5LmNvbGxpZGVyKSAmJiBlbnRpdHkuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IG92ZXJ3cml0ZSBpbiBvdGhlciBjaGlsZHJlbiB0byBkbyBvd24gdGhpbmdcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QXJlYU9mRWZmZWN0KGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYXBwbHlBcmVhT2ZFZmZlY3QoX2VudGl0eTogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICAvL1RPRE86IG92ZXJ3cml0ZSBpbiBvdGhlciBjbGFzc2VzXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyTmV0SWQgIT0gX2VudGl0eS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5sb2coXCJjb2xsaWRpbmcgd2l0aDogXCIgKyBfZW50aXR5Lm5hbWUpO1xyXG4gICAgICAgICAgICAgICAgQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5QT0lTT04pLmFkZFRvRW50aXR5KF9lbnRpdHkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbnRpdHkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEFUVFJJQlVURVRZUEUge1xyXG4gICAgICAgIEhFQUxUSFBPSU5UUyxcclxuICAgICAgICBNQVhIRUFMVEhQT0lOVFMsXHJcbiAgICAgICAgS05PQ0tCQUNLRk9SQ0UsXHJcbiAgICAgICAgSElUQUJMRSxcclxuICAgICAgICBBUk1PUixcclxuICAgICAgICBTUEVFRCxcclxuICAgICAgICBBVFRBQ0tQT0lOVFMsXHJcbiAgICAgICAgQ09PTERPV05SRURVQ1RJT04sXHJcbiAgICAgICAgU0NBTEVcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBBdHRyaWJ1dGVzIHtcclxuXHJcbiAgICAgICAgaGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgbWF4SGVhbHRoUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgICAgICBoaXRhYmxlOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBhcm1vcjogbnVtYmVyO1xyXG4gICAgICAgIHNwZWVkOiBudW1iZXI7XHJcbiAgICAgICAgYXR0YWNrUG9pbnRzOiBudW1iZXI7XHJcbiAgICAgICAgY29vbERvd25SZWR1Y3Rpb246IG51bWJlciA9IDE7XHJcbiAgICAgICAgc2NhbGU6IG51bWJlcjtcclxuICAgICAgICBhY2N1cmFjeTogbnVtYmVyID0gODA7XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaGVhbHRoUG9pbnRzOiBudW1iZXIsIF9hdHRhY2tQb2ludHM6IG51bWJlciwgX3NwZWVkOiBudW1iZXIsIF9zY2FsZTogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX2FybW9yOiBudW1iZXIsIF9jb29sZG93blJlZHVjdGlvbjogbnVtYmVyLCBfYWNjdXJhY3k6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnNjYWxlID0gX3NjYWxlO1xyXG4gICAgICAgICAgICB0aGlzLmFybW9yID0gX2FybW9yO1xyXG4gICAgICAgICAgICB0aGlzLmhlYWx0aFBvaW50cyA9IF9oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMubWF4SGVhbHRoUG9pbnRzID0gdGhpcy5oZWFsdGhQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gX2F0dGFja1BvaW50cztcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IF9zcGVlZDtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IF9rbm9ja2JhY2tGb3JjZVxyXG4gICAgICAgICAgICB0aGlzLmNvb2xEb3duUmVkdWN0aW9uID0gX2Nvb2xkb3duUmVkdWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLmFjY3VyYWN5ID0gX2FjY3VyYWN5O1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZVNjYWxlRGVwZW5kZW5jaWVzKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyA9IE1hdGgucm91bmQodGhpcy5tYXhIZWFsdGhQb2ludHMgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwKTtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMuaGVhbHRoUG9pbnRzICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLmF0dGFja1BvaW50cyAqIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gTWF0aC5mcm91bmQodGhpcy5zcGVlZCAvIHRoaXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gdGhpcy5rbm9ja2JhY2tGb3JjZSAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDA7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuICAgIGV4cG9ydCBjbGFzcyBCaWdCb29tIGV4dGVuZHMgRW5lbXlEdW1iIHtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3VtbW9ub3IgZXh0ZW5kcyBFbmVteVNob290IHtcclxuICAgICAgICBkYW1hZ2VUYWtlbjogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgYXR0YWNrUGhhc2VDZDogQWJpbGl0eS5Db29sZG93biA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDU4MCk7XHJcbiAgICAgICAgZGVmZW5jZVBoYXNlQ2Q6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big3MjApO1xyXG4gICAgICAgIGJlZ2luU2hvb3Rpbmc6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBzaG9vdGluZ0NvdW50OiBudW1iZXIgPSAzO1xyXG4gICAgICAgIGN1cnJlbnRTaG9vdGluZ0NvdW50OiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHN1bW1vblBvc2l0aW9uOiDGki5WZWN0b3IzID0gbmV3IMaSLlZlY3RvcjMoKTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzdW1tb246IEFiaWxpdHkuU3Bhd25TdW1tb25lcnMgPSBuZXcgQWJpbGl0eS5TcGF3blN1bW1vbmVycyh0aGlzLm5ldElkLCAwLCAxLCA0NSk7XHJcbiAgICAgICAgcHJpdmF0ZSBkYXNoOiBBYmlsaXR5LkRhc2ggPSBuZXcgQWJpbGl0eS5EYXNoKHRoaXMubmV0SWQsIDQ1LCAxLCAxMyAqIDYwLCA1KTtcclxuICAgICAgICBwcml2YXRlIHNob290MzYwOiBBYmlsaXR5LmNpcmNsZVNob290ID0gbmV3IEFiaWxpdHkuY2lyY2xlU2hvb3QodGhpcy5uZXRJZCwgMCwgMywgNSAqIDYwKTtcclxuICAgICAgICBwcml2YXRlIGRhc2hXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuU1VNTU9ORVIsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgcHJpdmF0ZSBmbG9jazogRmxvY2tpbmdCZWhhdmlvdXIgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgNCwgNCwgMCwgMCwgMSwgMSwgMSwgMik7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZGVmZW5jZVBoYXNlQ2Qub25FbmRDb29sRG93biA9IHRoaXMuc3RvcERlZmVuY2VQaGFzZTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2sudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2suZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb2NrLmF2b2lkV2VpZ2h0ID0gNTtcclxuICAgICAgICAgICAgICAgIC8vVE9ETzogSW50cm8gYW5pbWF0aW9uIGhlcmUgYW5kIHdoZW4gaXQgaXMgZG9uZSB0aGVuIGZpZ2h0Li4uXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZsb2NrLmF2b2lkV2VpZ2h0ID0gMDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuZGFtYWdlVGFrZW4gPj0gMjUpIHtcclxuICAgICAgICAgICAgICAgIG5ldyBCdWZmLkF0dHJpYnV0ZXNCdWZmKEJ1ZmYuQlVGRklELklNTVVORSwgbnVsbCwgMSwgMCkuYWRkVG9FbnRpdHkodGhpcyk7XHJcbiAgICAgICAgICAgICAgICAvLyBuZXcgQnVmZi5EYW1hZ2VCdWZmKEJ1ZmYuQlVGRklELlBPSVNPTiwgMTIwLCAzMCwgMykuYWRkVG9FbnRpdHkodGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLlNVTU1PTjtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRkxFRTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGdldERhbWFnZShfdmFsdWU6IG51bWJlcik6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXREYW1hZ2UoX3ZhbHVlKTtcclxuICAgICAgICAgICAgdGhpcy5kYW1hZ2VUYWtlbiArPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNraW5nUGhhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2UoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGF0dGFja2luZ1BoYXNlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuYXR0YWNrUGhhc2VDZC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tQaGFzZUNkLnNldE1heENvb2xEb3duID0gTWF0aC5yb3VuZCh0aGlzLmF0dGFja1BoYXNlQ2QuZ2V0TWF4Q29vbERvd24gKyBNYXRoLnJhbmRvbSgpICogNSArIE1hdGgucmFuZG9tKCkgKiAtNSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmF0dGFja1BoYXNlQ2Quc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmF0dGFja1BoYXNlQ2QuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKS50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiAxMCB8fCB0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMubW92ZURpcmVjdGlvbiwgOTApO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAxMDApID49IDEwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZGFzaC5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXNoV2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKS50b1ZlY3RvcjMoKSwgbnVsbCwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kYXNoV2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gQ2FsY3VsYXRpb24uY2xhbXBOdW1iZXIoTWF0aC5yYW5kb20oKSAqIDMwLCA4LCAzMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gKG5ldyDGki5WZWN0b3IyKDAsIDApKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvb3RpbmczNjAoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZGVmZW5jZVBoYXNlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnN1bW1vblBvc2l0aW9uLnNldChHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIEdhbWUuY3VycmVudFJvb20ubXR4V29ybGQudHJhbnNsYXRpb24ueSAtIChHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMyksIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueik7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy50ZWxlcG9ydCgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlNVTU1PTik7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmRlZmVuY2VQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2VDZC5zZXRNYXhDb29sRG93biA9IE1hdGgucm91bmQodGhpcy5kZWZlbmNlUGhhc2VDZC5nZXRNYXhDb29sRG93biArIE1hdGgucmFuZG9tKCkgKiA1ICsgTWF0aC5yYW5kb20oKSAqIC01KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZUNkLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZXF1YWxzKHRoaXMuc3VtbW9uUG9zaXRpb24sIDEpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwic3Bhd25pbmdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN1bW1vbi5kb0FiaWxpdHkoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHN0b3BEZWZlbmNlUGhhc2UgPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMuZGFtYWdlVGFrZW4gPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnN1bW1vblBvc2l0aW9uLnNldChHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLngsIEdhbWUuY3VycmVudFJvb20ubXR4V29ybGQudHJhbnNsYXRpb24ueSwgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi56KTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGVsZXBvcnQoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zaG9vdGluZzM2MCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYW1hZ2VUYWtlbiA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHRlbGVwb3J0KCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24uZXF1YWxzKHRoaXMuc3VtbW9uUG9zaXRpb24pKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLlRFTEVQT1JUKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5nZXRDdXJyZW50RnJhbWUgPj0gNSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLnN1bW1vblBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNob290aW5nMzYwKCkge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuYmVnaW5TaG9vdGluZykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2hvb3RpbmdDb3VudCA9IE1hdGgucm91bmQodGhpcy5zaG9vdGluZ0NvdW50ICsgTWF0aC5yYW5kb20oKSAqIDIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5iZWdpblNob290aW5nID0gdHJ1ZTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRTaG9vdGluZ0NvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvb3QzNjAuYnVsbGV0QW1vdW50ID0gTWF0aC5yb3VuZCg4ICsgTWF0aC5yYW5kb20oKSAqIDgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2hvb3QzNjAuZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuc2hvb3QzNjAuZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50U2hvb3RpbmdDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5iZWdpblNob290aW5nID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVmZiB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVGRklEIHtcclxuICAgICAgICBCTEVFRElORyxcclxuICAgICAgICBQT0lTT04sXHJcbiAgICAgICAgSEVBTCxcclxuICAgICAgICBTTE9XLFxyXG4gICAgICAgIElNTVVORSxcclxuICAgICAgICBTQ0FMRVVQLFxyXG4gICAgICAgIFNDQUxFRE9XTlxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIEJ1ZmYge1xyXG4gICAgICAgIGR1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgdGlja1JhdGU6IG51bWJlclxyXG4gICAgICAgIGlkOiBCVUZGSUQ7XHJcbiAgICAgICAgcHJvdGVjdGVkIG5vRHVyYXRpb246IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY29vbERvd246IEFiaWxpdHkuQ29vbGRvd247XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IF9kdXJhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy50aWNrUmF0ZSA9IF90aWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5ub0R1cmF0aW9uID0gMDtcclxuICAgICAgICAgICAgaWYgKF9kdXJhdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bihfZHVyYXRpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb29sRG93biA9IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldFBhcnRpY2xlQnlJZChfaWQ6IEJVRkZJRCk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELlBPSVNPTiwgVUkucG9pc29uUGFydGljbGUsIDYsIDEyKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELklNTVVORTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhCVUZGSUQuSU1NVU5FLCBVSS5pbW11bmVQYXJ0aWNsZSwgMSwgNik7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFwcGx5QnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZ2V0QnVmZlN0YXRzQnlJZCh0aGlzLmlkLCBfYXZhdGFyLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogcmVtb3ZlcyB0aGUgYnVmZiBmcm9tIHRoZSBidWZmIGxpc3QsIHJlbW92ZXMgdGhlIHBhcnRpY2xlIGFuZCBzZW5kcyB0aGUgbmV3IGxpc3QgdG8gdGhlIGNsaWVudFxyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSB0aGUgYnVmZiBzaG91bGQgYmUgcmVtb3ZlZFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyByZW1vdmVCdWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgX2F2YXRhci5yZW1vdmVDaGlsZChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkpO1xyXG4gICAgICAgICAgICBfYXZhdGFyLmJ1ZmZzLnNwbGljZShfYXZhdGFyLmJ1ZmZzLmluZGV4T2YodGhpcykpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZTdGF0c0J5SWQodGhpcy5pZCwgX2F2YXRhciwgZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBvbmx5IHVzZSB0aGlzIGZ1bmN0aW9uIHRvIGFkZCBidWZmcyB0byBlbnRpdGllc1xyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSBpdCBzaG91bGQgYmUgYWRkIHRvXHJcbiAgICAgICAgICogQHJldHVybnMgXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGFkZFRvRW50aXR5KF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKF9hdmF0YXIuYnVmZnMuZmlsdGVyKGJ1ZmYgPT4gYnVmZi5pZCA9PSB0aGlzLmlkKS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfYXZhdGFyLmJ1ZmZzLnB1c2godGhpcyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFBhcnRpY2xlKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29vbERvd24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sRG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KF9hdmF0YXIuYnVmZnMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBidWZmIGFwcGxpZXMgaXRzIGJ1ZmYgc3RhdHMgdG8gdGhlIGVudGl0eSBhbmQgZGVsZXRlcyBpdHNlbGYgd2hlbiBpdHMgZHVyYXRpb24gaXMgb3ZlclxyXG4gICAgICAgICAqIEBwYXJhbSBfYXZhdGFyIGVudGl0eSBpdCBzaG91bGQgYmUgYWRkIHRvXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgcHVibGljIGRvQnVmZlN0dWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZlN0YXRzQnlJZChfaWQ6IEJ1ZmYuQlVGRklELCBfYXZhdGFyOiBFbnRpdHkuRW50aXR5LCBfYWRkOiBib29sZWFuKSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFkZFBhcnRpY2xlKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKF9hdmF0YXIuZ2V0Q2hpbGRyZW4oKS5maW5kKGNoaWxkID0+ICg8VUkuUGFydGljbGVzPmNoaWxkKS5pZCA9PSB0aGlzLmlkKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBwYXJ0aWNsZSA9IHRoaXMuZ2V0UGFydGljbGVCeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYWRkQ2hpbGQocGFydGljbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLm10eExvY2FsLnNjYWxlKG5ldyDGki5WZWN0b3IzKF9hdmF0YXIubXR4TG9jYWwuc2NhbGluZy54LCBfYXZhdGFyLm10eExvY2FsLnNjYWxpbmcueSwgMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjIoX2F2YXRhci5vZmZzZXRDb2xsaWRlclgsIF9hdmF0YXIub2Zmc2V0Q29sbGlkZXJZKS50b1ZlY3RvcjMoMC4xKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgUmFyaXR5QnVmZiB7XHJcbiAgICAgICAgaWQ6IEl0ZW1zLlJBUklUWTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEl0ZW1zLlJBUklUWSkge1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZFRvSXRlbShfaXRlbTogSXRlbXMuSXRlbSkge1xyXG4gICAgICAgICAgICB0aGlzLmFkZFBhcnRpY2xlVG9JdGVtKF9pdGVtKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgZ2V0UGFydGljbGVCeUlkKF9pZDogSXRlbXMuUkFSSVRZKTogVUkuUGFydGljbGVzIHtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSXRlbXMuUkFSSVRZLkNPTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmNvbW1vblBhcnRpY2xlLCAxLCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5SQVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkucmFyZVBhcnRpY2xlLCAxLCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5FUElDOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkuZXBpY1BhcnRpY2xlLCAxLCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5MRUdFTkRBUlk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5sZWdlbmRhcnlQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmNvbW1vblBhcnRpY2xlLCAxLCAxMik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWRkUGFydGljbGVUb0l0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0pIHtcclxuICAgICAgICAgICAgaWYgKF9pdGVtLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKVxyXG4gICAgICAgICAgICAgICAgaWYgKHBhcnRpY2xlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9pdGVtLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfaXRlbS5tdHhMb2NhbC5zY2FsaW5nLngsIF9pdGVtLm10eExvY2FsLnNjYWxpbmcueSwgMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBhcnRpY2xlLm10eExvY2FsLnRyYW5zbGF0ZVooMC4xKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5hY3RpdmF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlcyBhIG5ldyBCdWZmIHRoYXQgZG9lcyBEYW1hZ2UgdG8gYW4gRW50aXR5O1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgRGFtYWdlQnVmZiBleHRlbmRzIEJ1ZmYge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBCVUZGSUQsIF9kdXJhdGlvbjogbnVtYmVyLCBfdGlja1JhdGU6IG51bWJlciwgX3ZhbHVlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfZHVyYXRpb24sIF90aWNrUmF0ZSlcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBEYW1hZ2VCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYW1hZ2VCdWZmKHRoaXMuaWQsIHRoaXMuZHVyYXRpb24sIHRoaXMudGlja1JhdGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQnVmZlN0dWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY29vbERvd24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuY29vbERvd24uaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAodGhpcy5jb29sRG93bi5nZXRDdXJyZW50Q29vbGRvd24gJSB0aGlzLnRpY2tSYXRlID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5vRHVyYXRpb24gJSB0aGlzLnRpY2tSYXRlID09IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbisrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZlN0YXRzQnlJZChfaWQ6IEJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5CTEVFRElORzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlBPSVNPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gb25seSBkbyBkYW1hZ2UgdG8gcGxheWVyIHVudGlsIGhlIGhhcyAyMCUgaGVhbHRoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlBsYXllcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMC4yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmdldERhbWFnZSh0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHsgcmV0dXJuOyB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBjcmVhdGVzIGEgbmV3IEJ1ZmYgdGhhdCBjaGFuZ2VzIGFuIGF0dHJpYnV0ZSBvZiBhbiBFbnRpdHkgZm9yIHRoZSBkdXJhdGlvbiBvZiB0aGUgYnVmZlxyXG4gICAgICovXHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlc0J1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICBwcml2YXRlIGlzQnVmZkFwcGxpZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgdmFsdWU6IG51bWJlcjtcclxuICAgICAgICBwcml2YXRlIHJlbW92ZWRWYWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy52YWx1ZSA9IF92YWx1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEF0dHJpYnV0ZXNCdWZmIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVzQnVmZih0aGlzLmlkLCB0aGlzLmR1cmF0aW9uLCB0aGlzLnRpY2tSYXRlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRvQnVmZlN0dWZmKF9hdmF0YXI6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5kdXJhdGlvbiA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmR1cmF0aW9uLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoIXRoaXMuaXNCdWZmQXBwbGllZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYXBwbHlCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXNCdWZmQXBwbGllZCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZFBhcnRpY2xlKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZlN0YXRzQnlJZChfaWQ6IEJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG4gICAgICAgICAgICBsZXQgcGF5bG9hZDogSW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuU0xPVzpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWRWYWx1ZSA9IF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtIENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCAtPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5oaXRhYmxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5ISVRBQkxFIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNDQUxFVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgPSBDYWxjdWxhdGlvbi5hZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC09IHRoaXMucmVtb3ZlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnVwZGF0ZVNjYWxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGF5bG9hZCA9IDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlZFZhbHVlID0gX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSArPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMocGF5bG9hZCwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRCdWZmQnlJZChfaWQ6IEJVRkZJRCk6IEJ1ZmYge1xyXG4gICAgICAgIGxldCByZWY6IEJ1ZmYgPSB1bmRlZmluZWQ7XHJcblxyXG4gICAgICAgIHJlZiA9IDxEYW1hZ2VCdWZmPkdhbWUuZGFtYWdlQnVmZkpTT04uZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gX2lkKTtcclxuICAgICAgICBpZiAocmVmICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhbWFnZUJ1ZmYoX2lkLCByZWYuZHVyYXRpb24sIHJlZi50aWNrUmF0ZSwgKDxEYW1hZ2VCdWZmPnJlZikudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmVmID0gPEF0dHJpYnV0ZXNCdWZmPkdhbWUuYXR0cmlidXRlQnVmZkpTT04uZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gX2lkKTtcclxuICAgICAgICBpZiAocmVmICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEF0dHJpYnV0ZXNCdWZmKF9pZCwgcmVmLmR1cmF0aW9uLCByZWYudGlja1JhdGUsICg8QXR0cmlidXRlc0J1ZmY+cmVmKS52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBCdWxsZXRzIHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBCVUxMRVRUWVBFIHtcclxuICAgICAgICBTVEFOREFSRCxcclxuICAgICAgICBISUdIU1BFRUQsXHJcbiAgICAgICAgU0xPVyxcclxuICAgICAgICBNRUxFRSxcclxuICAgICAgICBTVU1NT05FUixcclxuICAgICAgICBUSE9SU0hBTU1FUixcclxuICAgICAgICBaSVBaQVBcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldFR4dDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB3YXRlckJhbGxUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJ1bGxldCBleHRlbmRzIEdhbWUuxpIuTm9kZSBpbXBsZW1lbnRzIEludGVyZmFjZXMuSVNwYXduYWJsZSwgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLkJVTExFVDtcclxuICAgICAgICBvd25lck5ldElkOiBudW1iZXI7IGdldCBvd25lcigpOiBFbnRpdHkuRW50aXR5IHsgcmV0dXJuIEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gdGhpcy5vd25lck5ldElkKSB9O1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBjbGllbnRQcmVkaWN0aW9uOiBOZXR3b3JraW5nLkNsaWVudEJ1bGxldFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIHNlcnZlclByZWRpY3Rpb246IE5ldHdvcmtpbmcuU2VydmVyQnVsbGV0UHJlZGljdGlvbjtcclxuICAgICAgICBwdWJsaWMgZmx5RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG4gICAgICAgIGRpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHVibGljIGNvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuXHJcbiAgICAgICAgcHVibGljIGhpdFBvaW50c1NjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHNwZWVkOiBudW1iZXIgPSAyMDtcclxuICAgICAgICBsaWZldGltZTogbnVtYmVyID0gMSAqIDYwO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXIgPSA0O1xyXG4gICAgICAgIHR5cGU6IEJVTExFVFRZUEU7XHJcblxyXG4gICAgICAgIHRpbWU6IG51bWJlciA9IDA7XHJcbiAgICAgICAga2lsbGNvdW50OiBudW1iZXIgPSAxO1xyXG5cclxuICAgICAgICB0ZXh0dXJlUGF0aDogc3RyaW5nO1xyXG4gICAgICAgIGxhc3RQb3NpdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBjb3VudENoZWNrVXBkYXRlOiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPj0gMCAmJiB0aGlzLmxpZmV0aW1lICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUtLTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lIDwgMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVCdWxsZXQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMudHlwZSA9PSBCVUxMRVRUWVBFLlRIT1JTSEFNTUVSKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3Bhd25UaG9yc0hhbW1lcigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2J1bGxldFR5cGU6IEJVTExFVFRZUEUsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX293bmVyTmV0SWQ6IG51bWJlciwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKEJVTExFVFRZUEVbX2J1bGxldFR5cGVdKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMudHlwZSA9IF9idWxsZXRUeXBlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuSWRNYW5hZ2VyKF9uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgcmVmID0gR2FtZS5idWxsZXRzSlNPTi5maW5kKGJ1bGxldCA9PiBidWxsZXQubmFtZSA9PSBCVUxMRVRUWVBFW19idWxsZXRUeXBlXS50b0xvd2VyQ2FzZSgpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSByZWYuc3BlZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSByZWYuaGl0UG9pbnRzU2NhbGU7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSByZWYubGlmZXRpbWU7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSByZWYua25vY2tiYWNrRm9yY2U7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gcmVmLmtpbGxjb3VudDtcclxuICAgICAgICAgICAgdGhpcy50ZXh0dXJlUGF0aCA9IHJlZi50ZXh0dXJlUGF0aDtcclxuXHJcbiAgICAgICAgICAgIC8vIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRMaWdodChuZXcgxpIuTGlnaHRQb2ludCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDApO1xyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlclBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKGNvbGxpZGVyUG9zaXRpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueSAvIDEuNSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoKTtcclxuICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlgoKTtcclxuICAgICAgICAgICAgdGhpcy5kaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2VydmVyUHJlZGljdGlvbiA9IG5ldyBOZXR3b3JraW5nLlNlcnZlckJ1bGxldFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50UHJlZGljdGlvbiA9IG5ldyBOZXR3b3JraW5nLkNsaWVudEJ1bGxldFByZWRpY3Rpb24odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFBvc2l0aW9uID0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnByZWRpY3QoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBwcmVkaWN0KCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNsaWVudFByZWRpY3Rpb24udXBkYXRlKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hlY2tVcGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VydmVyUHJlZGljdGlvbi51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMuZmx5RGlyZWN0aW9uLmNsb25lKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm10eExvY2FsLnJvdGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGNoZWNrVXBkYXRlKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXN0UG9zaXRpb24gPT0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb3VudENoZWNrVXBkYXRlKys7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jb3VudENoZWNrVXBkYXRlID49ICgyICogNjApKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvdW50Q2hlY2tVcGRhdGUgPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFBvc2l0aW9uID0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkICYmIHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIyKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKHRoaXMuY2xpZW50UHJlZGljdGlvbi5taW5UaW1lQmV0d2VlblRpY2tzICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlUm90YXRpb24oX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgxpIuVmVjdG9yMy5TVU0oX2RpcmVjdGlvbiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pKSArIDkwKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzcGF3blRob3JzSGFtbWVyKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcmVtb3ZlSXRlbSA9IHRoaXMub3duZXIuaXRlbXMuZmluZChpdGVtID0+ICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgcmVtb3ZlSXRlbS5pZCwgcmVtb3ZlSXRlbS5uZXRJZCwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIuaXRlbXMuc3BsaWNlKHRoaXMub3duZXIuaXRlbXMuaW5kZXhPZihyZW1vdmVJdGVtKSwgMSk7XHJcblxyXG4gICAgICAgICAgICAgICAgbGV0IGl0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRDaG9vc2VuT25lTmV0SWQoR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaXRlbS5zZXRDaG9vc2VuT25lTmV0SWQoR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImNvb2xkb3duVGltZVwiKTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmFpbVR5cGUgPSAoPGFueT5XZWFwb25zLkFJTSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJhaW1UeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLmJ1bGxldFR5cGUgPSAoPGFueT5CVUxMRVRUWVBFKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImJ1bGxldFR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCA9ICtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcInByb2plY3RpbGVBbW91bnRcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5jYW5TaG9vdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24odGhpcy5vd25lci53ZWFwb24sIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBsb2FkVGV4dHVyZSgpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMudGV4dHVyZVBhdGggIT0gXCJcIiAmJiB0aGlzLnRleHR1cmVQYXRoICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3TXRyOiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm10clwiLCDGki5TaGFkZXJGbGF0VGV4dHVyZWQsIG5ld0NvYXQpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBvbGRDb21Db2F0OiDGki5Db21wb25lbnRNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCgpO1xyXG5cclxuICAgICAgICAgICAgICAgIG9sZENvbUNvYXQgPSB0aGlzLmdldENvbXBvbmVudCjGki5Db21wb25lbnRNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLnRleHR1cmVQYXRoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBidWxsZXRUeHQudXJsOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSBidWxsZXRUeHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2Ugd2F0ZXJCYWxsVHh0LnVybDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gd2F0ZXJCYWxsVHh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwiV0hJVEVcIik7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgICAgICBvbGRDb21Db2F0Lm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWZmVG9UYXJnZXQoX3RhcmdldDogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLmJ1ZmYuZm9yRWFjaChidWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVmZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmZi5jbG9uZSgpLmFkZFRvRW50aXR5KF90YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIG9mZnNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICBsZXQgbmV3UG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaXNpb25EZXRlY3Rpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBjb2xsaWRlcnM6IMaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vd25lci50YWcgPT0gVGFnLlRBRy5QTEFZRVIpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEVuZW15LkVuZW15PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgIGxldCBlbGVtZW50OiBFbmVteS5FbmVteSA9ICg8RW5lbXkuRW5lbXk+X2VsZW0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5FbmVteT5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQgaW5zdGFuY2VvZiBFbmVteS5TdW1tb25vckFkZHMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICgoPEVuZW15LlN1bW1vbm9yQWRkcz5lbGVtZW50KS5hdmF0YXIgPT0gdGhpcy5vd25lcikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuZ2V0RGFtYWdlKHRoaXMub3duZXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgKiB0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWZmVG9UYXJnZXQoKDxFbmVteS5FbmVteT5lbGVtZW50KSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgaWYgKHRoaXMub3duZXIudGFnID09IFRhZy5UQUcuRU5FTVkpIHtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycyA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuUExBWUVSKTtcclxuICAgICAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBlbGVtZW50OiBQbGF5ZXIuUGxheWVyID0gKDxQbGF5ZXIuUGxheWVyPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50LmNvbGxpZGVyKSAmJiBlbGVtZW50LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkICYmIHRoaXMua2lsbGNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gMCAmJiAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuYXR0cmlidXRlcy5oaXRhYmxlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuZ2V0RGFtYWdlKHRoaXMuaGl0UG9pbnRzU2NhbGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMuaGl0UG9pbnRzU2NhbGUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50LS07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5raWxsY291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvbGxpZGVycyA9IFtdO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtZW50ID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlJPT00pKS53YWxscztcclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogR2VuZXJhdGlvbi5XYWxsID0gKDxHZW5lcmF0aW9uLldhbGw+X2VsZW0pO1xyXG4gICAgICAgICAgICAgICAgaWYgKGVsZW1lbnQuY29sbGlkZXIgIT0gdW5kZWZpbmVkICYmIHRoaXMuY29sbGlkZXIuY29sbGlkZXNSZWN0KGVsZW1lbnQuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5saWZldGltZSA9IDA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBIb21pbmdCdWxsZXQgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMztcclxuICAgICAgICByb3RhdGVTcGVlZDogbnVtYmVyID0gMjtcclxuICAgICAgICB0YXJnZXREaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9idWxsZXR0eXBlOiBCVUxMRVRUWVBFLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9vd25lcklkOiBudW1iZXIsIF90YXJnZXQ/OiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2J1bGxldHR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgX293bmVySWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSAyMDtcclxuICAgICAgICAgICAgdGhpcy5oaXRQb2ludHNTY2FsZSA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAxICogNjA7XHJcbiAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gMTtcclxuICAgICAgICAgICAgaWYgKF90YXJnZXQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBfdGFyZ2V0O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyAgICAgdGhpcy50YXJnZXQgPSDGki5WZWN0b3IzLlNVTSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCBfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgLy8gfVxyXG4gICAgICAgICAgICB0aGlzLnRhcmdldERpcmVjdGlvbiA9IF9kaXJlY3Rpb247XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0VGFyZ2V0KEdhbWUuYXZhdGFyMi5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNhbGN1bGF0ZUhvbWluZygpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMub3duZXIgPT0gR2FtZS5hdmF0YXIxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0VGFyZ2V0KF9uZXRJRDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBfbmV0SUQpICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBfbmV0SUQpLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNhbGN1bGF0ZUhvbWluZygpIHtcclxuICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGlmIChuZXdEaXJlY3Rpb24ueCAhPSAwICYmIG5ld0RpcmVjdGlvbi55ICE9IDApIHtcclxuICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgcm90YXRlQW1vdW50MjogbnVtYmVyID0gxpIuVmVjdG9yMy5DUk9TUyhuZXdEaXJlY3Rpb24sIHRoaXMubXR4TG9jYWwuZ2V0WCgpKS56O1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnJvdGF0ZVooLXJvdGF0ZUFtb3VudDIgKiB0aGlzLnJvdGF0ZVNwZWVkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFppcFphcE9iamVjdCBleHRlbmRzIEJ1bGxldCB7XHJcbiAgICAgICAgcHJpdmF0ZSBuZXh0VGFyZ2V0OiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHJpdmF0ZSBhdmF0YXJzOiBQbGF5ZXIuUGxheWVyW107XHJcbiAgICAgICAgcHJpdmF0ZSBwbGF5ZXJTaXplOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSBjb3VudGVyOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSB0aWNrSGl0OiBBYmlsaXR5LkNvb2xkb3duO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKEJVTExFVFRZUEUuWklQWkFQLCBuZXcgxpIuVmVjdG9yMigwLCAwKSwgbmV3IMaSLlZlY3RvcjIoMCwgMCkudG9WZWN0b3IzKCksIF9vd25lck5ldElkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuY291bnRlciA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5VSTtcclxuICAgICAgICAgICAgdGhpcy50aWNrSGl0ID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oMTIpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoR2FtZS5hdmF0YXIxICE9IHVuZGVmaW5lZCAmJiBHYW1lLmF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuYXZhdGFycyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5wbGF5ZXJTaXplID0gdGhpcy5hdmF0YXJzLmxlbmd0aDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5uZXh0VGFyZ2V0ID0gdGhpcy5hdmF0YXJzWzAgJSB0aGlzLnBsYXllclNpemVdLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5uZXh0VGFyZ2V0LnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy50aWNrSGl0Lmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlzaW9uRGV0ZWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMudGlja0hpdC5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVsbGV0KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24sIHRoaXMubXR4TG9jYWwucm90YXRpb24sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMua2lsbGNvdW50ID0gNTA7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgc3Bhd24oKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc3Bhd25aaXBaYXAodGhpcy5vd25lck5ldElkLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUJ1bGxldCh0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKCkge1xyXG4gICAgICAgICAgICBsZXQgZGlyZWN0aW9uID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5uZXh0VGFyZ2V0LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gZGlyZWN0aW9uLm1hZ25pdHVkZVNxdWFyZWQ7XHJcbiAgICAgICAgICAgIGlmIChkaXJlY3Rpb24ubWFnbml0dWRlU3F1YXJlZCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLnNwZWVkKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGUoZGlyZWN0aW9uLnRvVmVjdG9yMygpKTtcclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgMSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb3VudGVyID0gKHRoaXMuY291bnRlciArIDEpICUgdGhpcy5wbGF5ZXJTaXplO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMubmV4dFRhcmdldCA9IHRoaXMuYXZhdGFyc1t0aGlzLmNvdW50ZXJdLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBDb2xsaWRlciB7XHJcbiAgICBleHBvcnQgY2xhc3MgQ29sbGlkZXIge1xyXG4gICAgICAgIHB1YmxpYyBvd25lck5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSByYWRpdXM6IG51bWJlcjsgZ2V0IGdldFJhZGl1cygpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5yYWRpdXMgfTtcclxuICAgICAgICBwdWJsaWMgcG9zaXRpb246IMaSLlZlY3RvcjI7XHJcblxyXG4gICAgICAgIGdldCB0b3AoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnkgLSB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBsZWZ0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgcmlnaHQoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnggKyB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdldCBib3R0b20oKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuICh0aGlzLnBvc2l0aW9uLnkgKyB0aGlzLnJhZGl1cyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9yYWRpdXM6IG51bWJlciwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5yYWRpdXMgPSBfcmFkaXVzO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0UG9zaXRpb24oX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3NpdGlvbiA9IF9wb3NpdGlvbjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSYWRpdXMoX25ld1JhZGl1czogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX25ld1JhZGl1cztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgPiBkaXN0YW5jZS5tYWduaXR1ZGUpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbGxpZGVzUmVjdChfY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxlZnQgPiBfY29sbGlkZXIucmlnaHQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMucmlnaHQgPCBfY29sbGlkZXIubGVmdCkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy50b3AgPiBfY29sbGlkZXIuYm90dG9tKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmJvdHRvbSA8IF9jb2xsaWRlci50b3ApIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb24oX2NvbGxpZGVyOiBDb2xsaWRlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlcyhfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2U6IMaSLlZlY3RvcjIgPSDGki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3NpdGlvbiwgX2NvbGxpZGVyLnBvc2l0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMucmFkaXVzICsgX2NvbGxpZGVyLnJhZGl1cyAtIGRpc3RhbmNlLm1hZ25pdHVkZTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJbnRlcnNlY3Rpb25SZWN0KF9jb2xsaWRlcjogxpIuUmVjdGFuZ2xlKTogxpIuUmVjdGFuZ2xlIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvbGxpZGVzUmVjdChfY29sbGlkZXIpKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcblxyXG4gICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uOiDGki5SZWN0YW5nbGUgPSBuZXcgxpIuUmVjdGFuZ2xlKCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi54ID0gTWF0aC5tYXgodGhpcy5sZWZ0LCBfY29sbGlkZXIubGVmdCk7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi55ID0gTWF0aC5tYXgodGhpcy50b3AsIF9jb2xsaWRlci50b3ApO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ud2lkdGggPSBNYXRoLm1pbih0aGlzLnJpZ2h0LCBfY29sbGlkZXIucmlnaHQpIC0gaW50ZXJzZWN0aW9uLng7XHJcbiAgICAgICAgICAgIGludGVyc2VjdGlvbi5oZWlnaHQgPSBNYXRoLm1pbih0aGlzLmJvdHRvbSwgX2NvbGxpZGVyLmJvdHRvbSkgLSBpbnRlcnNlY3Rpb24ueTtcclxuXHJcbiAgICAgICAgICAgIHJldHVybiBpbnRlcnNlY3Rpb247XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVuZW15U3Bhd25lciB7XHJcbiAgICBsZXQgc3Bhd25UaW1lOiBudW1iZXIgPSAwICogNjA7XHJcbiAgICBsZXQgY3VycmVudFRpbWU6IG51bWJlciA9IHNwYXduVGltZTtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25NdWx0aXBsZUVuZW1pZXNBdFJvb20oX21heEVuZW1pZXM6IG51bWJlciwgX3Jvb21Qb3M6IEdhbWUuxpIuVmVjdG9yMik6IHZvaWQge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBkZXBlbmRpbmcgb24gY3VycmVudHJvb20uZW5lbXlDb3VudCBhbmQgZGVjcmVhc2UgaXQgXHJcbiAgICAgICAgICAgIGxldCBzcGF3bmVkRW5lbWllczogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgd2hpbGUgKHNwYXduZWRFbmVtaWVzIDwgX21heEVuZW1pZXMpIHtcclxuICAgICAgICAgICAgICAgIGlmIChjdXJyZW50VGltZSA9PSBzcGF3blRpbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBuZXcgxpIuVmVjdG9yMigoKE1hdGgucmFuZG9tKCkgKiBHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMikgLSAoKE1hdGgucmFuZG9tKCkgKiBHYW1lLmN1cnJlbnRSb29tLnJvb21TaXplIC8gMikpKSwgKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpIC0gKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBvc2l0aW9uLmFkZChfcm9vbVBvcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiB1c2UgSUQgdG8gZ2V0IHJhbmRvbSBlbmVtaWVzXHJcbiAgICAgICAgICAgICAgICAgICAgc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEVU1CLCBFbnRpdHkuSUQuU01BTExUSUNLLCBwb3NpdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgc3Bhd25lZEVuZW1pZXMrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGN1cnJlbnRUaW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGN1cnJlbnRUaW1lID0gc3Bhd25UaW1lO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdldFJhbmRvbUVuZW15SWQoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgcmFuZG9tID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogT2JqZWN0LmtleXMoRW50aXR5LklEKS5sZW5ndGggLyAyKTtcclxuICAgICAgICBpZiAocmFuZG9tIDw9IDIpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGdldFJhbmRvbUVuZW15SWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKHJhbmRvbSk7XHJcbiAgICAgICAgICAgIHJldHVybiByYW5kb207XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3bkJ5SUQoX2VuZW15Q2xhc3M6IEVuZW15LkVORU1ZQ0xBU1MsIF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF90YXJnZXQ/OiBQbGF5ZXIuUGxheWVyLCBfbmV0SUQ/OiBudW1iZXIpIHtcclxuICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15O1xyXG4gICAgICAgIHN3aXRjaCAoX2VuZW15Q2xhc3MpIHtcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZREFTSDpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURVTUI6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RHVtYihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlQQVRST0w6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVBhdHJvbChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgLy8gY2FzZSBFbmVteS5FOlxyXG4gICAgICAgICAgICAvLyAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChfaWQsIG5ldyBFbnRpdHkuQXR0cmlidXRlcyhyZWYuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgcmVmLmF0dHJpYnV0ZXMuc3BlZWQsIHJlZi5hdHRyaWJ1dGVzLnNjYWxlLCBNYXRoLnJhbmRvbSgpICogcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgKyAwLjUsIHJlZi5hdHRyaWJ1dGVzLmFybW9yKSwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAvLyAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNob290KF9pZCwgX2F0dHJpYnV0ZXMsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgLy8gICAgIH1cclxuICAgICAgICAgICAgLy8gICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlTTUFTSDpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U21hc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U21hc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUzpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yQWRkcyhfaWQsIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3JBZGRzKF9pZCwgX3Bvc2l0aW9uLCBfdGFyZ2V0LCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUjpcclxuICAgICAgICAgICAgICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChlbmVteSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoZW5lbXkpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduRW5lbXkoX2VuZW15Q2xhc3MsIGVuZW15LCBlbmVteS5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBuZXR3b3JrU3Bhd25CeUlkKF9lbmVteUNsYXNzOiBFbmVteS5FTkVNWUNMQVNTLCBfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SUQ6IG51bWJlciwgX3RhcmdldD86IG51bWJlcikge1xyXG4gICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgaWYgKEdhbWUuYXZhdGFyMS5uZXRJZCA9PSBfdGFyZ2V0KSB7XHJcbiAgICAgICAgICAgICAgICBzcGF3bkJ5SUQoX2VuZW15Q2xhc3MsIF9pZCwgX3Bvc2l0aW9uLCBHYW1lLmF2YXRhcjEsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzcGF3bkJ5SUQoX2VuZW15Q2xhc3MsIF9pZCwgX3Bvc2l0aW9uLCBHYW1lLmF2YXRhcjIsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzcGF3bkJ5SUQoX2VuZW15Q2xhc3MsIF9pZCwgX3Bvc2l0aW9uLCBudWxsLCBfbmV0SUQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBGbG9ja2luZ0JlaGF2aW91ciB7XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50TmVpZ2hib3VyczogRW5lbXlbXTtcclxuICAgICAgICBwdWJsaWMgc2lnaHRSYWRpdXM6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgYXZvaWRSYWRpdXM6IG51bWJlclxyXG4gICAgICAgIHByaXZhdGUgZW5lbWllczogRW5lbXlbXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgcG9zOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHJpdmF0ZSBteUVuZW15OiBFbmVteTtcclxuICAgICAgICBwdWJsaWMgY29oZXNpb25XZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgYWxsaWduV2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF2b2lkV2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIHRvVGFyZ2V0V2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIG5vdFRvVGFyZ2V0V2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIG9ic3RpY2FsQXZvaWRXZWlnaHQ6IG51bWJlciA9IDEuNTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvYnN0aWNhbENvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2VuZW15OiBFbmVteSwgX3NpZ2h0UmFkaXVzOiBudW1iZXIsIF9hdm9pZFJhZGl1czogbnVtYmVyLCBfY29oZXNpb25XZWlnaHQ6IG51bWJlciwgX2FsbGlnbldlaWdodDogbnVtYmVyLCBfYXZvaWRXZWlnaHQ6IG51bWJlciwgX3RvVGFyZ2V0V2VpZ2h0OiBudW1iZXIsIF9ub3RUb1RhcmdldFdlaWdodDogbnVtYmVyLCBfb2JzdGljYWxBdm9pZFdlaWdodD86IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IF9lbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgdGhpcy5teUVuZW15ID0gX2VuZW15O1xyXG4gICAgICAgICAgICB0aGlzLnNpZ2h0UmFkaXVzID0gX3NpZ2h0UmFkaXVzO1xyXG4gICAgICAgICAgICB0aGlzLmF2b2lkUmFkaXVzID0gX2F2b2lkUmFkaXVzO1xyXG4gICAgICAgICAgICB0aGlzLmNvaGVzaW9uV2VpZ2h0ID0gX2NvaGVzaW9uV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLmFsbGlnbldlaWdodCA9IF9hbGxpZ25XZWlnaHQ7XHJcbiAgICAgICAgICAgIHRoaXMuYXZvaWRXZWlnaHQgPSBfYXZvaWRXZWlnaHQ7XHJcbiAgICAgICAgICAgIHRoaXMudG9UYXJnZXRXZWlnaHQgPSBfdG9UYXJnZXRXZWlnaHQ7XHJcbiAgICAgICAgICAgIHRoaXMubm90VG9UYXJnZXRXZWlnaHQgPSBfbm90VG9UYXJnZXRXZWlnaHQ7XHJcbiAgICAgICAgICAgIGlmIChfb2JzdGljYWxBdm9pZFdlaWdodCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9ic3RpY2FsQXZvaWRXZWlnaHQgPSBfb2JzdGljYWxBdm9pZFdlaWdodDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMucG9zLCB0aGlzLm15RW5lbXkuY29sbGlkZXIuZ2V0UmFkaXVzICogMS43NSwgdGhpcy5teUVuZW15Lm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgdGhpcy5lbmVtaWVzID0gR2FtZS5lbmVtaWVzO1xyXG4gICAgICAgICAgICB0aGlzLnBvcyA9IHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5wb3M7XHJcbiAgICAgICAgICAgIHRoaXMuZmluZE5laWdoYm91cnMoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwcml2YXRlIGZpbmROZWlnaGJvdXJzKCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnROZWlnaGJvdXJzID0gW107XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbWllcy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubXlFbmVteS5uZXRJZCAhPSBlbmVtLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW0ubXR4TG9jYWwudHJhbnNsYXRpb24uZ2V0RGlzdGFuY2UodGhpcy5wb3MudG9WZWN0b3IzKCkpIDwgdGhpcy5zaWdodFJhZGl1cykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLnB1c2goZW5lbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZUNvaGVzaW9uTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGNvaGVzaW9uTW92ZTogR2FtZS7Gki5WZWN0b3IyID0gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmZvckVhY2goZW5lbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgY29oZXNpb25Nb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShjb2hlc2lvbk1vdmUsIGVuZW0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZS5zY2FsZSgxIC8gdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgY29oZXNpb25Nb3ZlLnN1YnRyYWN0KHRoaXMucG9zKTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZSA9IENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQodGhpcy5teUVuZW15Lm1vdmVEaXJlY3Rpb24sIENhbGN1bGF0aW9uLmNhbGNEZWdyZWUodGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLCBjb2hlc2lvbk1vdmUudG9WZWN0b3IzKCkpIC8gMTApLnRvVmVjdG9yMigpXHJcbiAgICAgICAgICAgICAgICByZXR1cm4gY29oZXNpb25Nb3ZlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQWxsaWdubWVudE1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLm15RW5lbXkubW92ZURpcmVjdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbGxpZ25tZW50TW92ZTogR2FtZS7Gki5WZWN0b3IyID0gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmZvckVhY2goZW5lbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgYWxsaWdubWVudE1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKGFsbGlnbm1lbnRNb3ZlLCBlbmVtLm1vdmVEaXJlY3Rpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIGFsbGlnbm1lbnRNb3ZlLnNjYWxlKDEgLyB0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYWxsaWdubWVudE1vdmU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVBdm9pZGFuY2VNb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYXZvaWRhbmNlTW92ZTogR2FtZS7Gki5WZWN0b3IyID0gxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbkF2b2lkOiBudW1iZXIgPSAwO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKHRoaXMucG9zLnRvVmVjdG9yMygpKSA8IHRoaXMuYXZvaWRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbkF2b2lkKys7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGF2b2lkYW5jZU1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKGF2b2lkYW5jZU1vdmUsIEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zLCBlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgIGlmIChuQXZvaWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXZvaWRhbmNlTW92ZS5zY2FsZSgxIC8gbkF2b2lkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHJldHVybiBhdm9pZGFuY2VNb3ZlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlT2JzdGljYWxBdm9pZGFuY2VNb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBvYnN0aWNhbHM6IEdhbWUuxpIuTm9kZVtdID0gW107XHJcbiAgICAgICAgICAgIEdhbWUuY3VycmVudFJvb20ud2FsbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2Fscy5wdXNoKGVsZW0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgR2FtZS5jdXJyZW50Um9vbS5vYnN0aWNhbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2Fscy5wdXNoKGVsZW0pO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgbGV0IHJldHVyblZlY3RvcjogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IG5Bdm9pZDogbnVtYmVyID0gMDtcclxuXHJcbiAgICAgICAgICAgIG9ic3RpY2Fscy5mb3JFYWNoKG9ic3RpY2FsID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIgaW5zdGFuY2VvZiBHYW1lLsaSLlJlY3RhbmdsZSAmJiB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXNSZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZTogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5wb3MsIG9ic3RpY2FsLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICBtb3ZlLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uOiBHYW1lLsaSLlJlY3RhbmdsZSA9IHRoaXMub2JzdGljYWxDb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlOiBudW1iZXIgPSBpbnRlcnNlY3Rpb24ud2lkdGggKiBpbnRlcnNlY3Rpb24uaGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm9ic3RpY2FsQ29sbGlkZXIucG9zaXRpb24uYWRkKG5ldyBHYW1lLsaSLlZlY3RvcjIobW92ZS54LCAwKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMub2JzdGljYWxDb2xsaWRlci5jb2xsaWRlc1JlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpbnRlcnNlY3Rpb24gPSB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYWZ0ZXJCZWZvcmVNb3ZlOiBudW1iZXIgPSBpbnRlcnNlY3Rpb24ud2lkdGggKiBpbnRlcnNlY3Rpb24uaGVpZ2h0O1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDw9IGFmdGVyQmVmb3JlTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmVjdG9yLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKDAsIG1vdmUueSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmVjdG9yLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuVmVjdG9yLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyLnBvc2l0aW9uLnN1YnRyYWN0KG5ldyBHYW1lLsaSLlZlY3RvcjIobW92ZS54LCAwKSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG5Bdm9pZCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlciBpbnN0YW5jZW9mIENvbGxpZGVyLkNvbGxpZGVyICYmIHRoaXMub2JzdGljYWxDb2xsaWRlci5jb2xsaWRlcygoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zLCBvYnN0aWNhbC5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGxvY2FsQXdheTogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlNVTShtb3ZlLCB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VQb3MgPSAoR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5teUVuZW15LnRhcmdldCwgR2FtZS7Gki5WZWN0b3IyLlNVTShDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKGxvY2FsQXdheS5jbG9uZS50b1ZlY3RvcjMoKSwgMTM1KS50b1ZlY3RvcjIoKSwgdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXN0YW5jZU5lZyA9IChHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLm15RW5lbXkudGFyZ2V0LCBHYW1lLsaSLlZlY3RvcjIuU1VNKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobG9jYWxBd2F5LmNsb25lLnRvVmVjdG9yMygpLCAtMTM1KS50b1ZlY3RvcjIoKSwgdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKSkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoZGlzdGFuY2VOZWcubWFnbml0dWRlU3F1YXJlZCA+IGRpc3RhbmNlUG9zLm1hZ25pdHVkZVNxdWFyZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZS5hZGQoQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChtb3ZlLmNsb25lLnRvVmVjdG9yMygpLCAxMzUpLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBtb3ZlLmFkZChDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKG1vdmUuY2xvbmUudG9WZWN0b3IzKCksIC0xMzUpLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobW92ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIG5Bdm9pZCsrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgaWYgKG5Bdm9pZCA+IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5zY2FsZSgxIC8gbkF2b2lkKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcmV0dXJuIHJldHVyblZlY3RvcjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRNb3ZlVmVjdG9yKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBjb2hlc2lvbjogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IGF2b2lkOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICBsZXQgYWxsaWduOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICBsZXQgb2JzdGljYWxBdm9pZDogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuXHJcblxyXG4gICAgICAgICAgICBsZXQgdGFyZ2V0ID0gdGhpcy5teUVuZW15Lm1vdmVTaW1wbGUodGhpcy5teUVuZW15LnRhcmdldCk7XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQubWFnbml0dWRlU3F1YXJlZCA+IHRoaXMudG9UYXJnZXRXZWlnaHQgKiB0aGlzLnRvVGFyZ2V0V2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICB0YXJnZXQubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0LnNjYWxlKHRoaXMudG9UYXJnZXRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgbm90VG9UYXJnZXQgPSB0aGlzLm15RW5lbXkubW92ZUF3YXkodGhpcy5teUVuZW15LnRhcmdldClcclxuICAgICAgICAgICAgaWYgKG5vdFRvVGFyZ2V0Lm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0ICogdGhpcy5ub3RUb1RhcmdldFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgbm90VG9UYXJnZXQubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgbm90VG9UYXJnZXQuc2NhbGUodGhpcy5ub3RUb1RhcmdldFdlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGNvaGVzaW9uID0gdGhpcy5jYWxjdWxhdGVDb2hlc2lvbk1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKGNvaGVzaW9uLm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLmNvaGVzaW9uV2VpZ2h0ICogdGhpcy5jb2hlc2lvbldlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgY29oZXNpb24ubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgY29oZXNpb24uc2NhbGUodGhpcy5jb2hlc2lvbldlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYXZvaWQgPSB0aGlzLmNhbGN1bGF0ZUF2b2lkYW5jZU1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKGF2b2lkLm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLmF2b2lkV2VpZ2h0ICogdGhpcy5hdm9pZFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgYXZvaWQubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgYXZvaWQuc2NhbGUodGhpcy5hdm9pZFdlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYWxsaWduID0gdGhpcy5jYWxjdWxhdGVBbGxpZ25tZW50TW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAoYWxsaWduLm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLmFsbGlnbldlaWdodCAqIHRoaXMuYWxsaWduV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBhbGxpZ24ubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgYWxsaWduLnNjYWxlKHRoaXMuYWxsaWduV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgb2JzdGljYWxBdm9pZCA9IHRoaXMuY2FsY3VsYXRlT2JzdGljYWxBdm9pZGFuY2VNb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChvYnN0aWNhbEF2b2lkLm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLm9ic3RpY2FsQXZvaWRXZWlnaHQgKiB0aGlzLm9ic3RpY2FsQXZvaWRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQubm9ybWFsaXplO1xyXG4gICAgICAgICAgICAgICAgb2JzdGljYWxBdm9pZC5zY2FsZSh0aGlzLm9ic3RpY2FsQXZvaWRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgbW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0obm90VG9UYXJnZXQsIHRhcmdldCwgY29oZXNpb24sIGF2b2lkLCBhbGxpZ24sIG9ic3RpY2FsQXZvaWQpO1xyXG4gICAgICAgICAgICByZXR1cm4gbW92ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cclxuXHJcblxyXG4iLCJuYW1lc3BhY2UgRW50aXR5IHsgXHJcbiAgICBleHBvcnQgY2xhc3MgTWVyY2hhbnQgZXh0ZW5kcyBFbnRpdHl7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBudW1iZXIsIF9uZXRJZD86bnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ2FsY3VsYXRpb24ge1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldENsb3NlckF2YXRhclBvc2l0aW9uKF9zdGFydFBvaW50OiDGki5WZWN0b3IzKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuXHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlUGxheWVyMiA9IF9zdGFydFBvaW50LmdldERpc3RhbmNlKEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlUGxheWVyMSA8IGRpc3RhbmNlUGxheWVyMikge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0gR2FtZS5hdmF0YXIyO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICByZXR1cm4gdGFyZ2V0LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNhbGNEZWdyZWUoX2NlbnRlcjogxpIuVmVjdG9yMywgX3RhcmdldDogxpIuVmVjdG9yMyk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHhEaXN0YW5jZTogbnVtYmVyID0gX3RhcmdldC54IC0gX2NlbnRlci54O1xyXG4gICAgICAgIGxldCB5RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueSAtIF9jZW50ZXIueTtcclxuICAgICAgICBsZXQgZGVncmVlczogbnVtYmVyID0gTWF0aC5hdGFuMih5RGlzdGFuY2UsIHhEaXN0YW5jZSkgKiAoMTgwIC8gTWF0aC5QSSkgLSA5MDtcclxuICAgICAgICByZXR1cm4gZGVncmVlcztcclxuXHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChfdmVjdG9yVG9Sb3RhdGU6IMaSLlZlY3RvcjMsIF9hbmdsZTogbnVtYmVyKTogxpIuVmVjdG9yMyB7XHJcbiAgICAgICAgbGV0IGFuZ2xlVG9SYWRpYW46IG51bWJlciA9IF9hbmdsZSAqIChNYXRoLlBJIC8gMTgwKTtcclxuXHJcbiAgICAgICAgbGV0IG5ld1ggPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pIC0gX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLnNpbihhbmdsZVRvUmFkaWFuKTtcclxuICAgICAgICBsZXQgbmV3WSA9IF92ZWN0b3JUb1JvdGF0ZS54ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbikgKyBfdmVjdG9yVG9Sb3RhdGUueSAqIE1hdGguY29zKGFuZ2xlVG9SYWRpYW4pO1xyXG5cclxuICAgICAgICByZXR1cm4gbmV3IMaSLlZlY3RvcjMobmV3WCwgbmV3WSwgX3ZlY3RvclRvUm90YXRlLnopO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBhZGRQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKCgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkgLyAxMDApO1xyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9iYXNlVmFsdWU6IG51bWJlciwgX3BlcmNlbnRhZ2VBbW91bnQ6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgcmV0dXJuIF9iYXNlVmFsdWUgKiAoMTAwIC8gKDEwMCArIF9wZXJjZW50YWdlQW1vdW50KSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNsYW1wTnVtYmVyKF9udW1iZXI6IG51bWJlciwgX21pbjogbnVtYmVyLCBfbWF4OiBudW1iZXIpIHtcclxuICAgICAgICByZXR1cm4gTWF0aC5tYXgoX21pbiwgTWF0aC5taW4oX251bWJlciwgX21heCkpO1xyXG4gICAgfVxyXG5cclxuXHJcbn0iLCJuYW1lc3BhY2UgSW5wdXRTeXN0ZW0ge1xyXG5cclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXlkb3duXCIsIGtleWJvYXJkRG93bkV2ZW50KTtcclxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJrZXl1cFwiLCBrZXlib2FyZFVwRXZlbnQpO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlZG93blwiLCBhdHRhY2spO1xyXG4gICAgR2FtZS5jYW52YXMuYWRkRXZlbnRMaXN0ZW5lcihcIm1vdXNlbW92ZVwiLCByb3RhdGVUb01vdXNlKTtcclxuXHJcbiAgICAvLyNyZWdpb24gcm90YXRlXHJcbiAgICBsZXQgbW91c2VQb3NpdGlvbjogxpIuVmVjdG9yMztcclxuXHJcbiAgICBmdW5jdGlvbiByb3RhdGVUb01vdXNlKF9tb3VzZUV2ZW50OiBNb3VzZUV2ZW50KTogdm9pZCB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCByYXk6IMaSLlJheSA9IEdhbWUudmlld3BvcnQuZ2V0UmF5RnJvbUNsaWVudChuZXcgxpIuVmVjdG9yMihfbW91c2VFdmVudC5vZmZzZXRYLCBfbW91c2VFdmVudC5vZmZzZXRZKSk7XHJcbiAgICAgICAgICAgIG1vdXNlUG9zaXRpb24gPSByYXkuaW50ZXJzZWN0UGxhbmUobmV3IMaSLlZlY3RvcjMoMCwgMCwgMCksIG5ldyDGki5WZWN0b3IzKDAsIDAsIDEpKTtcclxuICAgICAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm10eExvY2FsLnJvdGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZShHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24sIG1vdXNlUG9zaXRpb24pKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjUG9zaXRpb25Gcm9tRGVncmVlKF9kZWdyZWVzOiBudW1iZXIsIF9kaXN0YW5jZTogbnVtYmVyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgbGV0IGRpc3RhbmNlID0gNTtcclxuICAgICAgICBsZXQgbmV3RGVnID0gKF9kZWdyZWVzICogTWF0aC5QSSkgLyAxODA7XHJcbiAgICAgICAgbGV0IHkgPSBNYXRoLmNvcyhuZXdEZWcpO1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5zaW4obmV3RGVnKSAqIC0xO1xyXG4gICAgICAgIGxldCBjb29yZCA9IG5ldyDGki5WZWN0b3IyKHgsIHkpO1xyXG4gICAgICAgIGNvb3JkLnNjYWxlKGRpc3RhbmNlKTtcclxuICAgICAgICByZXR1cm4gY29vcmQ7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gbW92ZSBhbmQgYWJpbGl0eVxyXG4gICAgbGV0IGNvbnRyb2xsZXIgPSBuZXcgTWFwPHN0cmluZywgYm9vbGVhbj4oW1xyXG4gICAgICAgIFtcIldcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkFcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIlNcIiwgZmFsc2VdLFxyXG4gICAgICAgIFtcIkRcIiwgZmFsc2VdXHJcbiAgICBdKTtcclxuXHJcbiAgICBmdW5jdGlvbiBrZXlib2FyZERvd25FdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpID09IFwiS0VZRVwiKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpICE9IFwiU1BBQ0VcIikge1xyXG4gICAgICAgICAgICAgICAgbGV0IGtleTogc3RyaW5nID0gX2UuY29kZS50b1VwcGVyQ2FzZSgpLnN1YnN0cmluZygzKTtcclxuICAgICAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSA9PSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIC8vRG8gYWJpbHR5IGZyb20gcGxheWVyXHJcbiAgICAgICAgICAgICAgICBhYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgPT0gXCJFU0NBUEVcIikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgICAgIEdhbWUucGF1c2UodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcodHJ1ZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmRVcEV2ZW50KF9lOiBLZXlib2FyZEV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgIGNvbnRyb2xsZXIuc2V0KGtleSwgZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbW92ZSgpOiBHYW1lLsaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBtb3ZlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG5cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJXXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSArPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJBXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJTXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueSAtPSAxO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoY29udHJvbGxlci5nZXQoXCJEXCIpKSB7XHJcbiAgICAgICAgICAgIG1vdmVWZWN0b3IueCArPSAxO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy8gR2FtZS5hdmF0YXIxLm1vdmUobW92ZVZlY3Rvcik7XHJcbiAgICAgICAgcmV0dXJuIG1vdmVWZWN0b3I7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gYWJpbGl0eSgpIHtcclxuICAgICAgICBHYW1lLmF2YXRhcjEuZG9BYmlsaXR5KCk7XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gYXR0YWNrXHJcbiAgICBmdW5jdGlvbiBhdHRhY2soZV86IE1vdXNlRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgbGV0IG1vdXNlQnV0dG9uID0gZV8uYnV0dG9uO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKG1vdXNlQnV0dG9uKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9sZWZ0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuYXR0YWNrXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKG1vdXNlUG9zaXRpb24sIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgcm90YXRlVG9Nb3VzZShlXyk7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmF0dGFjayhkaXJlY3Rpb24sIG51bGwsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogcmlnaHQgbW91c2UgYnV0dG9uIHBsYXllci5oZWF2eUF0dGFjayBvciBzb21ldGhpbmcgbGlrZSB0aGF0XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxufSIsIm5hbWVzcGFjZSBMZXZlbCB7XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIExhbmRzY2FwZSBleHRlbmRzIMaSLk5vZGV7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX25hbWU6IHN0cmluZykge1xyXG4gICAgICAgICAgICBzdXBlcihfbmFtZSk7XHJcblxyXG4gICAgICAgICAgICAvLyB0aGlzLmdldENoaWxkcmVuKClbMF0uZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKS5tdHhMb2NhbC50cmFuc2xhdGVaKC0yKVxyXG5cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIFVJIHtcclxuICAgIGV4cG9ydCBjbGFzcyBNaW5pbWFwIGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5VSTtcclxuICAgICAgICBwcml2YXRlIG1pbm1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdO1xyXG4gICAgICAgIHByaXZhdGUgcm9vbU1pbmltYXBzaXplOiBudW1iZXIgPSAwLjg7XHJcbiAgICAgICAgcHJpdmF0ZSBtaW5pUm9vbXM6IE1pbmlSb29tW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgb2Zmc2V0WDogbnVtYmVyID0gMTE7XHJcbiAgICAgICAgcHVibGljIG9mZnNldFk6IG51bWJlciA9IDY7XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50Um9vbTogR2VuZXJhdGlvbi5Sb29tO1xyXG4gICAgICAgIHByaXZhdGUgcG9pbnRlcjogR2FtZS7Gki5Ob2RlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfbWluaW1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiTWluaW1hcFwiKTtcclxuICAgICAgICAgICAgdGhpcy5taW5tYXBJbmZvID0gX21pbmltYXBJbmZvO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlciA9IG5ldyBHYW1lLsaSLk5vZGUoXCJwb2ludGVyXCIpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyBHYW1lLsaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcImNoYWxsZW5nZVJvb21NYXRcIiwgxpIuU2hhZGVyTGl0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibHVlXCIpKSkpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORSh0aGlzLnJvb21NaW5pbWFwc2l6ZSAvIDIpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLm10eExvY2FsLnRyYW5zbGF0ZVooMTApO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLnBvaW50ZXIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5yb29tTWluaW1hcHNpemUsIHRoaXMucm9vbU1pbmltYXBzaXplLCB0aGlzLnJvb21NaW5pbWFwc2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcblxyXG5cclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVNaW5pUm9vbXMoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q3VycmVudFJvb20oR2FtZS5jdXJyZW50Um9vbSk7XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduTWluaW1hcCh0aGlzLm1pbm1hcEluZm8pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjcmVhdGVNaW5pUm9vbXMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWlubWFwSW5mby5mb3JFYWNoKGVsZW1lbnQgPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5taW5pUm9vbXMucHVzaChuZXcgTWluaVJvb20oZWxlbWVudC5jb29yZHMsIGVsZW1lbnQucm9vbVR5cGUpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHRoaXMubWluaVJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFkZENoaWxkKHJvb20pO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByaXZhdGUgc2V0Q3VycmVudFJvb20oX3Jvb206IEdlbmVyYXRpb24uUm9vbSkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbmlSb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMoX3Jvb20uY29vcmRpbmF0ZXMpKS5pc0Rpc2NvdmVyZWQoKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFJvb20gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViWCA9IHRoaXMuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCAtIF9yb29tLmNvb3JkaW5hdGVzLng7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3ViWSA9IHRoaXMuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSAtIF9yb29tLmNvb3JkaW5hdGVzLnk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm9mZnNldFggKz0gc3ViWCAqIHRoaXMucm9vbU1pbmltYXBzaXplO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXRZICs9IHN1YlkgKiB0aGlzLnJvb21NaW5pbWFwc2l6ZTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50Um9vbSA9IF9yb29tO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Um9vbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRSb29tICE9IEdhbWUuY3VycmVudFJvb20pIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRSb29tKEdhbWUuY3VycmVudFJvb20pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMucG9pbnRlci5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubWluaVJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzKSkubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBub3JtYWxSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBjaGFsbGVuZ2VSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCBtZXJjaGFudFJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IHRyZWFzdXJlUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgYm9zc1Jvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcblxyXG4gICAgY2xhc3MgTWluaVJvb20gZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyBkaXNjb3ZlcmVkOiBib29sZWFuO1xyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHB1YmxpYyByb29tVHlwZTogR2VuZXJhdGlvbi5ST09NVFlQRTtcclxuICAgICAgICBwdWJsaWMgb3BhY2l0eTogbnVtYmVyID0gMC43NTtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSByb29tTWF0OiDGki5NYXRlcmlhbDtcclxuXHJcblxyXG4gICAgICAgIHByaXZhdGUgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEUpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJNaW5pbWFwUm9vbVwiKTtcclxuICAgICAgICAgICAgdGhpcy5jb29yZGluYXRlcyA9IF9jb29yZGluYXRlcztcclxuICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgdGhpcy5kaXNjb3ZlcmVkID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGNtcE1hdGVyaWFsOiDGki5Db21wb25lbnRNYXRlcmlhbDtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5yb29tVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgbm9ybWFsUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIG5vcm1hbFJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIG1lcmNoYW50Um9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgdHJlYXN1cmVSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgY2hhbGxlbmdlUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBib3NzUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNtcE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMucm9vbU1hdCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjModGhpcy5jb29yZGluYXRlcy54LCB0aGlzLmNvb3JkaW5hdGVzLnksIDEpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFjdGl2YXRlKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBpc0Rpc2NvdmVyZWQoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwiLy8vPHJlZmVyZW5jZSBwYXRoPVwiLi4vRlVER0UvTmV0L0J1aWxkL0NsaWVudC9GdWRnZUNsaWVudC5kLnRzXCIvPlxyXG5cclxubmFtZXNwYWNlIE5ldHdvcmtpbmcge1xyXG4gICAgZXhwb3J0IGVudW0gRlVOQ1RJT04ge1xyXG4gICAgICAgIENPTk5FQ1RFRCxcclxuICAgICAgICBTRVRHQU1FU1RBVEUsXHJcbiAgICAgICAgTE9BREVELFxyXG4gICAgICAgIFNFVFJFQURZLFxyXG4gICAgICAgIFNQQVdOLFxyXG4gICAgICAgIFRSQU5TRk9STSxcclxuICAgICAgICBDTElFTlRNT1ZFTUVOVCxcclxuICAgICAgICBTRVJWRVJCVUZGRVIsXHJcbiAgICAgICAgVVBEQVRFSU5WRU5UT1JZLFxyXG4gICAgICAgIEtOT0NLQkFDS1JFUVVFU1QsXHJcbiAgICAgICAgS05PQ0tCQUNLUFVTSCxcclxuICAgICAgICBTUEFXTkJVTExFVCxcclxuICAgICAgICBCVUxMRVRQUkVESUNULFxyXG4gICAgICAgIEJVTExFVFRSQU5TRk9STSxcclxuICAgICAgICBCVUxMRVRESUUsXHJcbiAgICAgICAgU1BBV05FTkVNWSxcclxuICAgICAgICBFTkVNWVRSQU5TRk9STSxcclxuICAgICAgICBFTlRJVFlBTklNQVRJT05TVEFURSxcclxuICAgICAgICBFTlRJVFlESUUsXHJcbiAgICAgICAgU1BBV05JTlRFUk5BTElURU0sXHJcbiAgICAgICAgVVBEQVRFQVRUUklCVVRFUyxcclxuICAgICAgICBVUERBVEVXRUFQT04sXHJcbiAgICAgICAgSVRFTURJRSxcclxuICAgICAgICBTRU5EUk9PTSxcclxuICAgICAgICBTV0lUQ0hST09NUkVRVUVTVCxcclxuICAgICAgICBVUERBVEVCVUZGLFxyXG4gICAgICAgIFVQREFURVVJLFxyXG4gICAgICAgIFNQV0FOTUlOSU1BUCxcclxuICAgICAgICBTUEFXTlpJUFpBUFxyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkNsaWVudCA9IEZ1ZGdlTmV0LkZ1ZGdlQ2xpZW50O1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY2xpZW50OiDGkkNsaWVudDtcclxuICAgIGV4cG9ydCBsZXQgY3JlYXRlZFJvb206IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgY2xpZW50czogQXJyYXk8eyBpZDogc3RyaW5nLCByZWFkeTogYm9vbGVhbiB9PiA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBwb3NVcGRhdGU6IMaSLlZlY3RvcjM7XHJcbiAgICBleHBvcnQgbGV0IHNvbWVvbmVJc0hvc3Q6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgIGV4cG9ydCBsZXQgZW5lbXk6IEVuZW15LkVuZW15O1xyXG4gICAgZXhwb3J0IGxldCBjdXJyZW50SURzOiBudW1iZXJbXSA9IFtdO1xyXG5cclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFNwYXduXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7IHNwYXduUGxheWVyKCkgfSwgdHJ1ZSk7XHJcbiAgICBsZXQgSVBDb25uZWN0aW9uID0gPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJJUENvbm5lY3Rpb25cIik7XHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNvbm5lY3RpbmdcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsIGNvbm5lY3RpbmcsIHRydWUpO1xyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY29ubmVjdGluZygpIHtcclxuICAgICAgICBjbGllbnQgPSBuZXcgxpJDbGllbnQoKTtcclxuICAgICAgICBjbGllbnQuYWRkRXZlbnRMaXN0ZW5lcihGdWRnZU5ldC5FVkVOVC5NRVNTQUdFX1JFQ0VJVkVELCByZWNlaXZlTWVzc2FnZSk7XHJcbiAgICAgICAgY2xpZW50LmNvbm5lY3RUb1NlcnZlcihJUENvbm5lY3Rpb24udmFsdWUpO1xyXG5cclxuICAgICAgICBhZGRDbGllbnRJRCgpXHJcblxyXG4gICAgICAgIGZ1bmN0aW9uIGFkZENsaWVudElEKCkge1xyXG4gICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG9iajogeyBpZDogc3RyaW5nLCByZWFkeTogYm9vbGVhbiB9ID0geyBpZDogY2xpZW50LmlkLCByZWFkeTogZmFsc2UgfTtcclxuICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaChvYmopO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChhZGRDbGllbnRJRCwgMzAwKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGFzeW5jIGZ1bmN0aW9uIHJlY2VpdmVNZXNzYWdlKF9ldmVudDogQ3VzdG9tRXZlbnQgfCBNZXNzYWdlRXZlbnQgfCBFdmVudCk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgICAgIGlmIChfZXZlbnQgaW5zdGFuY2VvZiBNZXNzYWdlRXZlbnQpIHtcclxuICAgICAgICAgICAgbGV0IG1lc3NhZ2U6IEZ1ZGdlTmV0Lk1lc3NhZ2UgPSBKU09OLnBhcnNlKF9ldmVudC5kYXRhKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkxPQURFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmxvYWRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChtZXNzYWdlLmlkU291cmNlICE9IGNsaWVudC5pZCkge1xyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0NSRUFURSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UuY29udGVudC5yb29tKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaHRtbDogSFRNTEVsZW1lbnQgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21JZFwiKTtcclxuICAgICAgICAgICAgICAgICAgICBodG1sLnBhcmVudEVsZW1lbnQuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgICAgICAgICAgICAgIGh0bWwudGV4dENvbnRlbnQgPSBtZXNzYWdlLmNvbnRlbnQucm9vbTtcclxuICAgICAgICAgICAgICAgICAgICBjcmVhdGVkUm9vbSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgam9pblJvb20obWVzc2FnZS5jb250ZW50LnJvb20pO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0VOVEVSKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGNyZWF0ZWRSb29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudC5iZWNvbWVIb3N0KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgPT0gRnVkZ2VOZXQuQ09NTUFORC5ST09NX0dFVF9JRFMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSAhPSBcImhpZGRlblwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tczogc3RyaW5nW10gPSBtZXNzYWdlLmNvbnRlbnQucm9vbXM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUm9vbXNcIikuaW5uZXJIVE1MID0gXCJcIjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb21zLmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb29tczogc3RyaW5nW10gPSBbXTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHJvb20gIT0gXCJMb2JieVwiKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb21zLnB1c2goXCI8cD5cIiArIHJvb20gKyBcIjwvcD5cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21zXCIpLmlubmVySFRNTCA9IG5ld1Jvb21zLnRvU3RyaW5nKCkucmVwbGFjZUFsbChcIixcIiwgXCJcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBnZXRSb29tcygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9LCA1MDAwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELlNFUlZFUl9IRUFSVEJFQVQgJiYgbWVzc2FnZS5jb21tYW5kICE9IEZ1ZGdlTmV0LkNPTU1BTkQuQ0xJRU5UX0hFQVJUQkVBVCkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vQWRkIG5ldyBjbGllbnQgdG8gYXJyYXkgY2xpZW50c1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNPTk5FQ1RFRC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudmFsdWUgIT0gY2xpZW50LmlkICYmIGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQgPT0gbWVzc2FnZS5jb250ZW50LnZhbHVlKSA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkID09IG1lc3NhZ2UuY29udGVudC52YWx1ZSkgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNsaWVudHMucHVzaCh7IGlkOiBtZXNzYWdlLmNvbnRlbnQudmFsdWUsIHJlYWR5OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VUR0FNRVNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC5wbGF5aW5nKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnBsYXlpbmcoZmFsc2UsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKCFtZXNzYWdlLmNvbnRlbnQucGxheWluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wYXVzZShmYWxzZSwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU1BBV04gTUlOSU1BUCBCWSBDTElFTlRcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUFdBTk1JTklNQVAudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgb2xkTWluaU1hcEluZm8gPSBtZXNzYWdlLmNvbnRlbnQubWluaU1hcEluZm9zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3TWluaU1hcEluZm86IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgb2xkTWluaU1hcEluZm8ubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdDb29yZHM6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIob2xkTWluaU1hcEluZm9baV0uY29vcmRzLmRhdGFbMF0sIG9sZE1pbmlNYXBJbmZvW2ldLmNvb3Jkcy5kYXRhWzFdKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3TWluaU1hcEluZm8ucHVzaCg8SW50ZXJmYWNlcy5JTWluaW1hcEluZm9zPnsgY29vcmRzOiBuZXdDb29yZHMsIHJvb21UeXBlOiBvbGRNaW5pTWFwSW5mb1tpXS5yb29tVHlwZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLm1pbmlNYXAgPSBuZXcgVUkuTWluaW1hcChuZXdNaW5pTWFwSW5mbyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5taW5pTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vRlJPTSBDTElFTlQgSU5QVVQgVkVDVE9SUyBGUk9NIEFWQVRBUlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0VmVjdG9yID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0OiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5pbnB1dC50aWNrLCBpbnB1dFZlY3RvcjogaW5wdXRWZWN0b3IsIGRvZXNBYmlsaXR5OiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuZG9lc0FiaWxpdHkgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnNlcnZlclByZWRpY3Rpb25BdmF0YXIudXBkYXRlRW50aXR5VG9DaGVjayhtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLnNlcnZlclByZWRpY3Rpb25BdmF0YXIub25DbGllbnRJbnB1dChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvLyBUTyBDTElFTlQgQ0FMQ1VMQVRFRCBQT1NJVElPTiBGT1IgQVZBVEFSXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VSVkVSQlVGRkVSLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHMgPSBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbnRpdHkgPT4gZW50aXR5Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnRpY2ssIHBvc2l0aW9uOiBwb3NpdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0T2JqICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9iaiA9IG5ldE9iai5uZXRPYmplY3ROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9iaiBpbnN0YW5jZW9mIFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+b2JqKS5jbGllbnQub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxCdWxsZXRzLkJ1bGxldD5vYmopLmNsaWVudFByZWRpY3Rpb24ub25TZXJ2ZXJNb3ZlbWVudFN0YXRlKHN0YXRlKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgLy9GUk9NIENMSUVOVCBCVUxMRVQgVkVDVE9SU1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXRWZWN0b3IgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmlucHV0LnRpY2ssIGlucHV0VmVjdG9yOiBpbnB1dFZlY3RvciB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXRPYmo6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzID0gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobmV0T2JqICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gPEJ1bGxldHMuQnVsbGV0Pm5ldE9iai5uZXRPYmplY3ROb2RlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gY29uc29sZS5sb2coYnVsbGV0ICsgXCJcIiArIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuc2VydmVyUHJlZGljdGlvbi51cGRhdGVFbnRpdHlUb0NoZWNrKG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuc2VydmVyUHJlZGljdGlvbi5vbkNsaWVudElucHV0KGlucHV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vU2V0IGNsaWVudCByZWFkeVxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFVFJFQURZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQuaWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGF2YXRhcjIgYXMgcmFuZ2VkIG9yIG1lbGVlIFxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ldElkOiBudW1iZXIgPSBtZXNzYWdlLmNvbnRlbnQubmV0SWRcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGF0dHJpYnV0ZXM6IEVudGl0eS5BdHRyaWJ1dGVzID0gbmV3IEVudGl0eS5BdHRyaWJ1dGVzKG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5zcGVlZCwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuc2NhbGUsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5hcm1vciwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmFjY3VyYWN5KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC50eXBlID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyID0gbmV3IFBsYXllci5NZWxlZShFbnRpdHkuSUQuTUVMRUUsIGF0dHJpYnV0ZXMsIG5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBFbnRpdHkuSUQuUkFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIgPSBuZXcgUGxheWVyLlJhbmdlZChFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoR2FtZS5hdmF0YXIyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9SdW50aW1lIHVwZGF0ZXMgYW5kIGNvbW11bmljYXRpb25cclxuICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3luYyBhdmF0YXIyIHBvc2l0aW9uIGFuZCByb3RhdGlvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5UUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHRlc3Q6IEdhbWUuxpIuVmVjdG9yMyA9IG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gLy8gY29uc29sZS5sb2codGVzdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb3RhdGVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuYXZhdGFyMiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBtb3ZlVmVjdG9yO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5tdHhMb2NhbC5yb3RhdGlvbiA9IHJvdGF0ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIuY29sbGlkZXIucG9zaXRpb24gPSBtb3ZlVmVjdG9yLnRvVmVjdG9yMigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgLy8gR2FtZS5hdmF0YXIyLmF2YXRhclByZWRpY3Rpb24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vVXBkYXRlIGludmVudG9yeVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEl0ZW1zLkl0ZW07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoSXRlbXMuZ2V0QnVmZkl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pdGVtSWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pdGVtSWQsIG1lc3NhZ2UuY29udGVudC5pdGVtTmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChJdGVtcy5nZXRJbnRlcm5hbEl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pdGVtSWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShtZXNzYWdlLmNvbnRlbnQuaXRlbUlkLCBtZXNzYWdlLmNvbnRlbnQuaXRlbU5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW0pLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudC5hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuaXRlbXMucHVzaChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5Lml0ZW1zLnNwbGljZShlbnRpdHkuaXRlbXMuaW5kZXhPZihlbnRpdHkuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gbmV3SXRlbS5pZCkpLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9DbGllbnQgcmVxdWVzdCBmb3IgbW92ZSBrbm9ja2JhY2tcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW5lbXk6IEVuZW15LkVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0hvc3QgcHVzaCBtb3ZlIGtub2NrYmFjayBmcm9tIGVuZW15XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLktOT0NLQkFDS1BVU0gudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEuZ2V0S25vY2tiYWNrKG1lc3NhZ2UuY29udGVudC5rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGJ1bGxldCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05CVUxMRVQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldDogQnVsbGV0cy5CdWxsZXQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5OiBFbnRpdHkuRW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQub3duZXJOZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBlbnRpdHkud2VhcG9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY2l0b246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoICg8V2VhcG9ucy5BSU0+bWVzc2FnZS5jb250ZW50LmFpbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBXZWFwb25zLkFJTS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQgPSBuZXcgQnVsbGV0cy5CdWxsZXQod2VhcG9uLmJ1bGxldFR5cGUsIGVudGl0eS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgZGlyZWNpdG9uLCBlbnRpdHkubmV0SWQsIG1lc3NhZ2UuY29udGVudC5idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBXZWFwb25zLkFJTS5IT01JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0VGFyZ2V0OiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gbmV3IEJ1bGxldHMuSG9taW5nQnVsbGV0KHdlYXBvbi5idWxsZXRUeXBlLCBlbnRpdHkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGRpcmVjaXRvbiwgZW50aXR5Lm5ldElkLCBidWxsZXRUYXJnZXQsIG1lc3NhZ2UuY29udGVudC5idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChidWxsZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYnVsbGV0IHRyYW5zZm9ybSBmcm9tIGhvc3QgdG8gY2xpZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkJVTExFVFRSQU5TRk9STS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLm5ldE9iamVjdE5vZGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3UG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb3RhdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubmV0T2JqZWN0Tm9kZS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ld1Bvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5uZXRPYmplY3ROb2RlLm10eExvY2FsLnJvdGF0aW9uID0gbmV3Um90YXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGJ1bGxldCBhdCB0aGUgY2xpZW50IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldCA9IEdhbWUuYnVsbGV0cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWxsZXQuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBlbmVteSBhdCB0aGUgY2xpZW50IFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTkVORU1ZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEVuZW15U3Bhd25lci5uZXR3b3JrU3Bhd25CeUlkKFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5lbmVteUNsYXNzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5pZCxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXcgxpIuVmVjdG9yMihcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQubmV0SWQsIG1lc3NhZ2UuY29udGVudC50YXJnZXQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgZW5lbXkgdHJhbnNmb3JtIGZyb20gaG9zdCB0byBjbGllbnRcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5FTVlUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15ID0gR2FtZS5lbmVtaWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbXkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW5lbXkuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYW5pbWF0aW9uIHN0YXRlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVOVElUWUFOSU1BVElPTlNUQVRFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5zd2l0Y2hBbmltYXRpb24obWVzc2FnZS5jb250ZW50LnN0YXRlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9LaWxsIGVudGl0eSBhdCB0aGUgY2xpZW50IGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTlRJVFlESUUudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbmVtID0+IGVuZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmRpZSgpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIEVudGl0eSBidWZmIExpc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQlVGRi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZkxpc3Q6IEJ1ZmYuQnVmZltdID0gPEJ1ZmYuQnVmZltdPm1lc3NhZ2UuY29udGVudC5idWZmTGlzdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW50ID0+IGVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYnVmZnMuZm9yRWFjaChvbGRCdWZmID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZUb0NoZWNrID0gYnVmZkxpc3QuZmluZChidWZmID0+IGJ1ZmYuaWQgPT0gb2xkQnVmZi5pZClcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmZUb0NoZWNrID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgb2xkQnVmZi5yZW1vdmVCdWZmKGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmZMaXN0LmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdCdWZmID0gQnVmZi5nZXRCdWZmQnlJZChidWZmLmlkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi50aWNrUmF0ZSA9IGJ1ZmYudGlja1JhdGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYuZHVyYXRpb24gPSBidWZmLmR1cmF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWZmLmFkZFRvRW50aXR5KGVudGl0eSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy91cGRhdGUgVUlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFVUkudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiDGki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzFdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3IFVJLkRhbWFnZVVJKHBvc2l0aW9uLnRvVmVjdG9yMygpLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9zcGF3biBzcGVjaWFsIGl0ZW1zXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOWklQWkFQLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtOiBCdWxsZXRzLlppcFphcE9iamVjdCA9IG5ldyBCdWxsZXRzLlppcFphcE9iamVjdChtZXNzYWdlLmNvbnRlbnQub3duZXJOZXRJZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05JTlRFUk5BTElURU0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSBjbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEl0ZW1zLmdldEJ1ZmZJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW0gPSBuZXcgSXRlbXMuQnVmZkl0ZW0obWVzc2FnZS5jb250ZW50LmlkLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmIChJdGVtcy5nZXRJbnRlcm5hbEl0ZW1CeUlkKG1lc3NhZ2UuY29udGVudC5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50LmlkLCBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9hcHBseSBpdGVtIGF0dHJpYnV0ZXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUy50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc3dpdGNoIChtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC50eXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5IRUFMVEhQT0lOVFM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLk1BWEhFQUxUSFBPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWVcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5LTk9DS0JBQ0tGT1JDRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5ISVRBQkxFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5oaXRhYmxlID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQVJNT1I6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmFybW9yID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuU1BFRUQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLnNwZWVkID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQVRUQUNLUE9JTlRTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5DT09MRE9XTlJFRFVDVElPTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuc2NhbGUgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LnVwZGF0ZVNjYWxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL2FwcGx5IHdlYXBvblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5VUERBVEVXRUFQT04udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHJlZldlYXBvbjogV2VhcG9ucy5XZWFwb24gPSA8V2VhcG9ucy5XZWFwb24+bWVzc2FnZS5jb250ZW50LndlYXBvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKG1lc3NhZ2UuY29udGVudC53ZWFwb24uY29vbGRvd24uY29vbERvd24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc3QgdGVtcFdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24obWVzc2FnZS5jb250ZW50LndlYXBvbi5jb29sZG93bi5jb29sRG93biwgbWVzc2FnZS5jb250ZW50LndlYXBvbi5hdHRhY2tDb3VudCwgcmVmV2VhcG9uLmJ1bGxldFR5cGUsIHJlZldlYXBvbi5wcm9qZWN0aWxlQW1vdW50LCByZWZXZWFwb24ub3duZXJOZXRJZCwgcmVmV2VhcG9uLmFpbVR5cGUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGVtcFdlYXBvbi5jYW5TaG9vdCA9IHJlZldlYXBvbi5jYW5TaG9vdDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5HYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkpLndlYXBvbiA9IHRlbXBXZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBpdGVtIGZyb20gaG9zdFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5JVEVNRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpdGVtID0gR2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZW5lbSA9PiAoPEl0ZW1zLkl0ZW0+ZW5lbSkubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb3BJRChtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByb29tIFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRU5EUk9PTS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgY29vcmRpYW50ZXM6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIobWVzc2FnZS5jb250ZW50LnJvb20uY29vcmRpbmF0ZXMuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvb20uY29vcmRpbmF0ZXMuZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgdGFuc2xhdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm9vbS50cmFuc2xhdGlvbi5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mbzogSW50ZXJmYWNlcy5JUm9vbSA9IHsgY29vcmRpbmF0ZXM6IGNvb3JkaWFudGVzLCByb29tU2l6ZTogbWVzc2FnZS5jb250ZW50LnJvb20ucm9vbVNpemUsIGV4aXRzOiBtZXNzYWdlLmNvbnRlbnQucm9vbS5leGl0cywgcm9vbVR5cGU6IG1lc3NhZ2UuY29udGVudC5yb29tLnJvb21UeXBlLCB0cmFuc2xhdGlvbjogdGFuc2xhdGlvbiB9O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Jvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAocm9vbUluZm8ucm9vbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuU1RBUlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5TdGFydFJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLk5vcm1hbFJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkJPU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5Cb3NzUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuVFJFQVNVUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5UcmVhc3VyZVJvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uTWVyY2hhbnRSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5DSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5DaGFsbGVuZ2VSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5leGl0cyA9IHJvb21JbmZvLmV4aXRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHJvb21JbmZvLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5zZXRTcGF3blBvaW50cygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbS5vcGVuRG9vcnMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdlbmVyYXRpb24uYWRkUm9vbVRvR3JhcGgobmV3Um9vbSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc2VuZCByZXF1ZXN0IHRvIHN3aXRjaCByb29tc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TV0lUQ0hST09NUkVRVUVTVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLnN3aXRjaFJvb20obWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRDbGllbnRSZWFkeSgpIHtcclxuICAgICAgICBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IGNsaWVudC5pZCkucmVhZHkgPSB0cnVlO1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVFJFQURZLCBuZXRJZDogY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldEdhbWVzdGF0ZShfcGxheWluZzogYm9vbGVhbikge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VUR0FNRVNUQVRFLCBwbGF5aW5nOiBfcGxheWluZyB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjcmVhdGVSb29tKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5TRVJWRVIsIGNvbW1hbmQ6IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9DUkVBVEUgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGpvaW5Sb29tKF9yb29tSWQ6IHN0cmluZykge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5TRVJWRVIsIGNvbW1hbmQ6IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9FTlRFUiwgY29udGVudDogeyByb29tOiBfcm9vbUlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvb21zKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5TRVJWRVIsIGNvbW1hbmQ6IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9HRVRfSURTIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiBwbGF5ZXJcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBsb2FkZWQoKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uTE9BREVEIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduUGxheWVyKCkge1xyXG4gICAgICAgIGlmIChHYW1lLmF2YXRhcjEuaWQgPT0gRW50aXR5LklELk1FTEVFKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBFbnRpdHkuSUQuTUVMRUUsIGF0dHJpYnV0ZXM6IEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IEdhbWUuYXZhdGFyMS5uZXRJZCB9IH0pXHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLlZJQV9TRVJWRVIsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV04sIHR5cGU6IEVudGl0eS5JRC5SQU5HRUQsIGF0dHJpYnV0ZXM6IEdhbWUuYXZhdGFyMS5hdHRyaWJ1dGVzLCBwb3NpdGlvbjogR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgbmV0SWQ6IEdhbWUuYXZhdGFyMS5uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50KCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IE5ldHdvcmtpbmcuRlVOQ1RJT04uQ09OTkVDVEVELCB2YWx1ZTogTmV0d29ya2luZy5jbGllbnQuaWQgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQXZhdGFyUG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfcm90YXRpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlRSQU5TRk9STSwgdmFsdWU6IF9wb3NpdGlvbiwgcm90YXRpb246IF9yb3RhdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kQ2xpZW50SW5wdXQoX25ldElkOiBudW1iZXIsIF9pbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkNMSUVOVE1PVkVNRU5ULCBuZXRJZDogX25ldElkLCBpbnB1dDogX2lucHV0UGF5bG9hZCB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRTZXJ2ZXJCdWZmZXIoX25ldElkOiBudW1iZXIsIF9idWZmZXI6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCkge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVJWRVJCVUZGRVIsIG5ldElkOiBfbmV0SWQsIGJ1ZmZlcjogX2J1ZmZlciB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBrbm9ja2JhY2tSZXF1ZXN0KF9uZXRJZDogbnVtYmVyLCBfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50LmlkSG9zdCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5LTk9DS0JBQ0tSRVFVRVNULCBuZXRJZDogX25ldElkLCBrbm9ja2JhY2tGb3JjZTogX2tub2NrYmFja0ZvcmNlLCBwb3NpdGlvbjogX3Bvc2l0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24ga25vY2tiYWNrUHVzaChfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5LTk9DS0JBQ0tQVVNILCBrbm9ja2JhY2tGb3JjZTogX2tub2NrYmFja0ZvcmNlLCBwb3NpdGlvbjogX3Bvc2l0aW9uIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlSW52ZW50b3J5KF9hZGQ6IGJvb2xlYW4sIF9pdGVtSWQ6IEl0ZW1zLklURU1JRCwgX2l0ZW1OZXRJZDogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChjbGllbnQuaWQgPT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50LmlkSG9zdCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIGFkZDogX2FkZCwgaXRlbUlkOiBfaXRlbUlkLCBpdGVtTmV0SWQ6IF9pdGVtTmV0SWQsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25NaW5pbWFwKF9taW5pTWFwSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BXQU5NSU5JTUFQLCBtaW5pTWFwSW5mb3M6IF9taW5pTWFwSW5mb3MgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGJ1bGxldFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnVsbGV0KF9haW1UeXBlOiBXZWFwb25zLkFJTSwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldE5ldElkOiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIsIF9idWxsZXRUYXJnZXQ/OiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVQsIGFpbVR5cGU6IF9haW1UeXBlLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24sIG93bmVyTmV0SWQ6IF9vd25lck5ldElkLCBidWxsZXROZXRJZDogX2J1bGxldE5ldElkLCBidWxsZXRUYXJnZXQ6IF9idWxsZXRUYXJnZXQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kQnVsbGV0SW5wdXQoX25ldElkOiBudW1iZXIsIF9pbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gc3BlY2lhbEl0ZW1zXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduWmlwWmFwKF9vd25lck5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOWklQWkFQLCBvd25lck5ldElkOiBfb3duZXJOZXRJZCwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGVuZW15XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVteShfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2VuZW15OiBFbmVteS5FbmVteSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05FTkVNWSwgZW5lbXlDbGFzczogX2VuZW15Q2xhc3MsIGlkOiBfZW5lbXkuaWQsIGF0dHJpYnV0ZXM6IF9lbmVteS5hdHRyaWJ1dGVzLCBwb3NpdGlvbjogX2VuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogX25ldElkLCB0YXJnZXQ6IF9lbmVteS50YXJnZXQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW50aXR5QW5pbWF0aW9uU3RhdGUoX3N0YXRlOiBFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUsIHN0YXRlOiBfc3RhdGUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAvLyAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgPT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUsIHN0YXRlOiBfc3RhdGUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG5cclxuICAgICAgICAvLyB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlRW50aXR5KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGl0ZW1zXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25JdGVtKF9pZDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLCBpZDogX2lkLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F0dHJpYnV0ZVBheWxvYWQ6IEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZCwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgcGF5bG9hZDogX2F0dHJpYnV0ZVBheWxvYWQsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIHBheWxvYWQ6IF9hdHRyaWJ1dGVQYXlsb2FkLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhcldlYXBvbihfd2VhcG9uOiBXZWFwb25zLldlYXBvbiwgX3RhcmdldE5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uLCBuZXRJZDogX3RhcmdldE5ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVJdGVtKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uIGJ1ZmZzXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVmZkxpc3QoX2J1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQlVGRiwgYnVmZkxpc3Q6IF9idWZmTGlzdCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBVSVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVVSSwgcG9zaXRpb246IF9wb3NpdGlvbiwgdmFsdWU6IF92YWx1ZSB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcm9vbVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRSb29tKF9yb29tOiBJbnRlcmZhY2VzLklSb29tKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFTkRST09NLCByb29tOiBfcm9vbSB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb21SZXF1ZXN0KF9kaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cykge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50LmlkSG9zdCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TV0lUQ0hST09NUkVRVUVTVCwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdlbmVyYXRlcyBpbmRpdmlkdWFsIElEcyBvbiBIb3N0IHdpdGhvdXQgZHVwbGljYXRlcyByZXR1cm5zIHRoZSBnaXZlbiBOZXRJZFxyXG4gICAgICogQHBhcmFtIF9uZXRJZCBpZiB1bmRlZmluZWQgZ2VuZXJhdGVzIGEgbmV3IE5ldElkIC0+IG9ubHkgdW5kZWZpbmVkIG9uIEhvc3RcclxuICAgICAqIEByZXR1cm5zIGEgbmV3IG5ldElkIG9yIHRoZSBuZXRJZCBwcm92aWRlZCBieSB0aGUgaG9zdFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gSWRNYW5hZ2VyKF9uZXRJZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgcmV0dXJuIF9uZXRJZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZU5ld0lkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlTmV3SWQoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbmV3SWQ6IG51bWJlcjtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBuZXdJZCA9IGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoaWQgPT4gaWQgPT0gbmV3SWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudElEcy5wdXNoKG5ld0lkKTtcclxuICAgICAgICByZXR1cm4gbmV3SWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaWRHZW5lcmF0b3IoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwKTtcclxuICAgICAgICByZXR1cm4gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBvcElEKF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoY3VycmVudElEcy5pbmRleE9mKF9pZCksIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc05ldHdvcmtPYmplY3QoX29iamVjdDogYW55KTogX29iamVjdCBpcyBJbnRlcmZhY2VzLklOZXR3b3JrYWJsZSB7XHJcbiAgICAgICAgcmV0dXJuIFwibmV0SWRcIiBpbiBfb2JqZWN0O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROZXRJZChfb2JqZWN0OiBHYW1lLsaSLk5vZGUpOiBudW1iZXIge1xyXG4gICAgICAgIGlmIChpc05ldHdvcmtPYmplY3QoX29iamVjdCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIF9vYmplY3QubmV0SWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIG9uVW5sb2FkLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25VbmxvYWQoKSB7XHJcbiAgICAgICAgLy9UT0RPOiBUaGluZ3Mgd2UgZG8gYWZ0ZXIgdGhlIHBsYXllciBsZWZ0IHRoZSBnYW1lXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUGxheWVyIGV4dGVuZHMgRW50aXR5LkVudGl0eSB7XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMjUsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMSwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuXHJcbiAgICAgICAgcHVibGljIGNsaWVudDogTmV0d29ya2luZy5DbGllbnRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gX2F0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50ID0gbmV3IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sbGlkZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGVNb3ZlVmVjdG9yKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9wZW5Eb29yKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLldhbGxbXT5HYW1lLmN1cnJlbnRSb29tLmdldENoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICB3YWxscy5mb3JFYWNoKCh3YWxsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAod2FsbC5kb29yICE9IHVuZGVmaW5lZCAmJiB3YWxsLmRvb3IuaXNBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3Qod2FsbC5kb29yLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uRG9vcj53YWxsLmRvb3IpLmNoYW5nZVJvb20oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAmJiB0aGlzID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKHRoaXMuY2xpZW50Lm1pblRpbWVCZXR3ZWVuVGlja3MgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHByZWRpY3QoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50LnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKElucHV0U3lzdGVtLm1vdmUoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRJdGVtQ29sbGlzaW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBlbmVtaWVzOiBFbmVteS5FbmVteVtdID0gR2FtZS5lbmVtaWVzO1xyXG4gICAgICAgICAgICBsZXQgZW5lbWllc0NvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcltdID0gW107XHJcbiAgICAgICAgICAgIGVuZW1pZXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVuZW1pZXNDb2xsaWRlci5wdXNoKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPOiB1bmNvbW1lbnRcclxuICAgICAgICAgICAgLy8gdGhpcy5jYWxjdWxhdGVDb2xsaWRlcihlbmVtaWVzQ29sbGlkZXIsIF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1Db2xsaXNpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtQ29sbGlkZXI6IEl0ZW1zLkl0ZW1bXSA9IEdhbWUuaXRlbXM7XHJcbiAgICAgICAgICAgIGl0ZW1Db2xsaWRlci5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoaXRlbS5jb2xsaWRlcikpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5JbnRlcm5hbEl0ZW0gJiYgKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuY2hvb3Nlbk9uZU5ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuY2hvb3Nlbk9uZU5ldElkICE9IHRoaXMubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20ucm9vbVR5cGUgPT0gR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uVHJlYXN1cmVSb29tPkdhbWUuY3VycmVudFJvb20pLm9uSXRlbUNvbGxlY3QoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50Um9vbS5yb29tVHlwZSA9PSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKDxHZW5lcmF0aW9uLk1lcmNoYW50Um9vbT5HYW1lLmN1cnJlbnRSb29tKS5vbkl0ZW1Db2xsZWN0KGl0ZW0sIHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KHRydWUsIGl0ZW0uaWQsIGl0ZW0ubmV0SWQsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkSXRlbVRvRW50aXR5KHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkludGVybmFsSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5CdWZmSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArIEJ1ZmYuQlVGRklEWyg8SXRlbXMuQnVmZkl0ZW0+aXRlbSkuYnVmZlswXS5pZF0udG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gKDxFbmVteS5FbmVteT5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGJsb2NrOiBBYmlsaXR5LkJsb2NrID0gbmV3IEFiaWxpdHkuQmxvY2sodGhpcy5uZXRJZCwgNjAwLCAxLCA1ICogNjApO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcbiAgICAgICAgcHVibGljIHN3b3JkUmFkaXVzOiBudW1iZXIgPSAwLjc1O1xyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGF0dGFjayhfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ/OiBudW1iZXIsIF9zeW5jPzogYm9vbGVhbikge1xyXG4gICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIF9zeW5jKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAvLyAgICAgbGV0IG5ld1BvczogR2FtZS7Gki5WZWN0b3IyID0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5jbG9uZS50b1ZlY3RvcjIoKTtcclxuXHJcbiAgICAgICAgLy8gICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAvLyAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgLy8gICAgICAgICBfZGlyZWN0aW9uLnNjYWxlKDAuNSk7XHJcbiAgICAgICAgLy8gICAgIH1cclxuXHJcbiAgICAgICAgLy8gICAgIG5ld1Bvcy5hZGQoX2RpcmVjdGlvbi50b1ZlY3RvcjIoKSk7XHJcblxyXG4gICAgICAgIC8vICAgICBsZXQgc3dvcmRDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3UG9zLCB0aGlzLnN3b3JkUmFkaXVzIC8gMiwgdGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgIC8vICAgICBHYW1lLmVuZW1pZXMuZm9yRWFjaChlbmVteSA9PiB7XHJcbiAgICAgICAgLy8gICAgICAgICBpZiAoc3dvcmRDb2xsaWRlci5jb2xsaWRlcyhlbmVteS5jb2xsaWRlcikpIHtcclxuICAgICAgICAvLyAgICAgICAgICAgICBlbmVteS5nZXREYW1hZ2UodGhpcy5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyk7XHJcbiAgICAgICAgLy8gICAgICAgICB9XHJcbiAgICAgICAgLy8gICAgIH0pXHJcbiAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAvL0Jsb2NrXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgdGhpcy5ibG9jay5kb0FiaWxpdHkoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgUmFuZ2VkIGV4dGVuZHMgUGxheWVyIHtcclxuXHJcbiAgICAgICAgcHVibGljIGRhc2g6IEFiaWxpdHkuRGFzaCA9IG5ldyBBYmlsaXR5LkRhc2godGhpcy5uZXRJZCwgOCwgMSwgNjAsIDUpO1xyXG4gICAgICAgIHBlcmZvcm1BYmlsaXR5OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgbGFzdE1vdmVEaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMztcclxuXHJcbiAgICAgICAgcHVibGljIG1vdmUoX2RpcmVjdGlvbjogxpIuVmVjdG9yMykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKHRoaXMubGFzdE1vdmVEaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3VwZXIubW92ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9EYXNoXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXNoLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBHZW5lcmF0aW9uIHtcclxuICAgIGV4cG9ydCBlbnVtIFJPT01UWVBFIHtcclxuICAgICAgICBTVEFSVCxcclxuICAgICAgICBOT1JNQUwsXHJcbiAgICAgICAgTUVSQ0hBTlQsXHJcbiAgICAgICAgVFJFQVNVUkUsXHJcbiAgICAgICAgQ0hBTExFTkdFLFxyXG4gICAgICAgIEJPU1NcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlDb3VudE1hbmFnZXIge1xyXG4gICAgICAgIHByaXZhdGUgbWF4RW5lbXlDb3VudDogbnVtYmVyOyBnZXQgZ2V0TWF4RW5lbXlDb3VudCgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5tYXhFbmVteUNvdW50IH07XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50RW5lbXlDb291bnQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgZmluaXNoZWQ6IGJvb2xlYW47XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2VuZW15Q291bnQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm1heEVuZW15Q291bnQgPSBfZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RW5lbXlDb291bnQgPSBfZW5lbXlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAoX2VuZW15Q291bnQgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5maW5pc2hlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkVuZW15RGVhdGgoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEVuZW15Q29vdW50LS07XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRFbmVteUNvb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBsZXQgdHh0U3RhcnRSb29tOiBHYW1lLsaSLlRleHR1cmVJbWFnZSA9IG5ldyBHYW1lLsaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBSb29tIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRztcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IFJPT01UWVBFO1xyXG4gICAgICAgIHB1YmxpYyBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHB1YmxpYyB3YWxsczogV2FsbFtdID0gW107XHJcbiAgICAgICAgcHVibGljIG9ic3RpY2FsczogT2JzaXRjYWxbXSA9IFtdO1xyXG4gICAgICAgIHB1YmxpYyBlbmVteUNvdW50TWFuYWdlcjogRW5lbXlDb3VudE1hbmFnZXI7XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uVXBkYXRlZDogYm9vbGVhbiA9IGZhbHNlO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXIgPSAzMDtcclxuICAgICAgICBleGl0czogSW50ZXJmYWNlcy5JUm9vbUV4aXRzOyAvLyBOIEUgUyBXXHJcbiAgICAgICAgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgY21wTWVzaDogxpIuQ29tcG9uZW50TWVzaCA9IG5ldyDGki5Db21wb25lbnRNZXNoKHRoaXMubWVzaCk7XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnROOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50TigpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50TiB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50RTogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludEUoKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludEUgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludFM6IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnRTKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnRTIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnRXOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50VygpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50VyB9O1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGlhbnRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlciwgX3Jvb21UeXBlOiBST09NVFlQRSkge1xyXG4gICAgICAgICAgICBzdXBlcihcInJvb21cIik7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5ST09NO1xyXG4gICAgICAgICAgICB0aGlzLmNvb3JkaW5hdGVzID0gX2Nvb3JkaWFudGVzO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW15Q291bnRNYW5hZ2VyID0gbmV3IEVuZW15Q291bnRNYW5hZ2VyKDApO1xyXG4gICAgICAgICAgICBpZiAoX3Jvb21TaXplICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb29tU2l6ZSA9IF9yb29tU2l6ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX3Jvb21UeXBlICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yb29tVHlwZSA9IF9yb29tVHlwZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmV4aXRzID0gPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IMaSLlZlY3RvcjModGhpcy5yb29tU2l6ZSwgdGhpcy5yb29tU2l6ZSwgMSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KHRoaXMuY21wTWF0ZXJpYWwpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIC0wLjAxKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkV2FsbHMoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCkge1xyXG5cclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpOiB2b2lkIHtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFkZFdhbGxzKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLjUsIDApLCBuZXcgxpIuVmVjdG9yMigxIC8gdGhpcy5yb29tU2l6ZSwgMSArIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgMC41KSwgbmV3IMaSLlZlY3RvcjIoMSwgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigtMC41LCAwKSwgbmV3IMaSLlZlY3RvcjIoMSAvIHRoaXMucm9vbVNpemUsIDEgKyAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKDAsIC0wLjUpLCBuZXcgxpIuVmVjdG9yMigxLCAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKDxXYWxsPmVsZW0pLnRhZyA9PSBUYWcuVEFHLldBTEwpLmZvckVhY2god2FsbCA9PiB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndhbGxzLnB1c2goKDxXYWxsPndhbGwpKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRTcGF3blBvaW50cygpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50RSA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMiksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFcgPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggLSAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnROID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpKTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50UyA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55IC0gKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0Um9vbVNpemUoKTogbnVtYmVyIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucm9vbVNpemU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Um9vbUV4aXQoX25laWdoYm91cjogUm9vbSkge1xyXG4gICAgICAgICAgICBsZXQgZGlmID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UoX25laWdoYm91ci5jb29yZGluYXRlcywgdGhpcy5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZU5vcnRoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy5ub3J0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZUVhc3QpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLmVhc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVTb3V0aCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMuc291dGggPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChkaWYuZXF1YWxzKGNvbXBhcmVXZXN0KSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy53ZXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9wZW5Eb29ycygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMubm9ydGgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24ubm9ydGggPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLmVhc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24uZWFzdCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMuc291dGgpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24uc291dGggPT0gdHJ1ZSkuZG9vci5vcGVuRG9vcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmV4aXRzLndlc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMuZmluZCh3YWxsID0+IHdhbGwuZG9vci5kaXJlY3Rpb24ud2VzdCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTdGFydFJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBwcml2YXRlIHN0YXJ0Um9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJzdGFydFJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiksIHR4dFN0YXJ0Um9vbSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuU1RBUlQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLnN0YXJ0Um9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE5vcm1hbFJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBub3JtYWxSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm5vcm1hbFJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLk5PUk1BTCk7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoNSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMubm9ybWFsUm9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJvc3NSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgYm9zc1Jvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiYm9zc1Jvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmxhY2tcIikpKTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLkJPU1MpO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuYm9zc1Jvb21NYXQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBUcmVhc3VyZVJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBwcml2YXRlIHRyZWFzdXJlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJ0cmVhc3VyZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwieWVsbG93XCIpKSk7XHJcbiAgICAgICAgcHJpdmF0ZSBzcGF3bkNoYW5jZTogbnVtYmVyID0gMjU7IGdldCBnZXRTcGF3bkNoYW5jZSgpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5zcGF3bkNoYW5jZSB9O1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVDb3VudDogbnVtYmVyID0gMjtcclxuICAgICAgICBwcml2YXRlIHRyZWFzdXJlczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5UUkVBU1VSRSk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy50cmVhc3VyZVJvb21NYXQ7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlVHJlYXN1cmVzKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlVHJlYXN1cmVzKCkge1xyXG4gICAgICAgICAgICBsZXQgdHJlYXN1cmVzOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLnRyZWFzdXJlQ291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdHJlYXN1cmVzLnB1c2goSXRlbXMuSXRlbUdlbmVyYXRvci5nZXRSYW5kb21JdGVtKCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudHJlYXN1cmVzID0gdHJlYXN1cmVzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgbGV0IGk6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMudHJlYXN1cmVzLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIGksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSkpXHJcbiAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25JdGVtQ29sbGVjdChfaXRlbTogSXRlbXMuSXRlbSkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy50cmVhc3VyZXMuZmluZChpdGVtID0+IGl0ZW0gPT0gX2l0ZW0pICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMuc3BsaWNlKHRoaXMudHJlYXN1cmVzLmluZGV4T2YoX2l0ZW0pLCAxKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIE1lcmNoYW50Um9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgbWVyY2hhbnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcIm1lcmNoYW50Um9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJncmVlblwiKSkpO1xyXG4gICAgICAgIHByaXZhdGUgbWVyY2hhbnQ6IEVudGl0eS5NZXJjaGFudCA9IG5ldyBFbnRpdHkuTWVyY2hhbnQoRW50aXR5LklELk1FUkNIQU5UKTtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIGl0ZW1zU3Bhd25Qb2ludHM6IMaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbUNvdW50OiBudW1iZXIgPSA1O1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuTUVSQ0hBTlQpO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMubWVyY2hhbnRSb29tTWF0O1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tZXJjaGFudC5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnRyYW5zbGF0ZVkoNSAvIHRoaXMucm9vbVNpemUpO1xyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnNjYWxlKEdhbWUuxpIuVmVjdG9yMy5PTkUoMSAvIHRoaXMucm9vbVNpemUpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCh0aGlzLm1lcmNoYW50KTtcclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3JlYXRlU2hvcCgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZVNob3AoKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtczogSXRlbXMuSXRlbVtdID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5pdGVtQ291bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaXRlbXMucHVzaChJdGVtcy5JdGVtR2VuZXJhdG9yLmdldFJhbmRvbUl0ZW0oKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5pdGVtcyA9IGl0ZW1zO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5jcmVhdGVTcGF3blBvaW50cygpO1xyXG5cclxuICAgICAgICAgICAgbGV0IGkgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zLmZvckVhY2goaXRlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXRlbS5nZXRQb3NpdGlvbiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5pdGVtc1NwYXduUG9pbnRzLmZpbmQocG9zID0+IHBvcy5lcXVhbHMoaXRlbS5nZXRQb3NpdGlvbikpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMuaXRlbXNTcGF3blBvaW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpdGVtLnNldFBvc2l0aW9uKHRoaXMuaXRlbXNTcGF3blBvaW50c1tpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGNyZWF0ZVNwYXduUG9pbnRzKCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMgPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGxldCBtaWRkbGUgPSB0aGlzLm10eFdvcmxkLmNsb25lLnRyYW5zbGF0aW9uO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5pdGVtc1NwYXduUG9pbnRzLnB1c2gobmV3IMaSLlZlY3RvcjIobWlkZGxlLngsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCArIDMsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCAtIDMsIG1pZGRsZS55ICsgMykpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCArIDIsIG1pZGRsZS55ICsgMSkpO1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCAtIDIsIG1pZGRsZS55ICsgMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uSXRlbUNvbGxlY3QoX2l0ZW06IEl0ZW1zLkl0ZW0sIF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0gPT0gX2l0ZW0pICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuc2hvcGluZyhfaXRlbSwgX2F2YXRhcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBzaG9waW5nKF9pdGVtOiBJdGVtcy5JdGVtLCBfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBzYW1lUmFyaXR5OiBJdGVtcy5JdGVtW10gPSBfYXZhdGFyLml0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IF9pdGVtLnJhcml0eSk7XHJcbiAgICAgICAgICAgIGxldCBsb3dlclJhcml0eTogSXRlbXMuSXRlbVtdID0gW107XHJcblxyXG4gICAgICAgICAgICBpZiAoX2l0ZW0ucmFyaXR5ICE9IEl0ZW1zLlJBUklUWS5DT01NT04pIHtcclxuICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5ID0gX2F2YXRhci5pdGVtcy5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSAoX2l0ZW0ucmFyaXR5IC0gMSkpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoc2FtZVJhcml0eS5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChzYW1lUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgIHNhbWVSYXJpdHlbaW5kZXhdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIHNhbWVSYXJpdHlbaW5kZXhdLmlkLCBzYW1lUmFyaXR5W2luZGV4XS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAobG93ZXJSYXJpdHkubGVuZ3RoID49IDMpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXgxOiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobG93ZXJSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5W2luZGV4MV0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShsb3dlclJhcml0eS5pbmRleE9mKGxvd2VyUmFyaXR5W2luZGV4MV0pLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zbGljZShpbmRleDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShpbmRleDEsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBsb3dlclJhcml0eVtpbmRleDFdLmlkLCBsb3dlclJhcml0eVtpbmRleDFdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4MjogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGxvd2VyUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eVtpbmRleDJdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UobG93ZXJSYXJpdHkuaW5kZXhPZihsb3dlclJhcml0eVtpbmRleDJdKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc2xpY2UoaW5kZXgyLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UoaW5kZXgyLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgbG93ZXJSYXJpdHlbaW5kZXgyXS5pZCwgbG93ZXJSYXJpdHlbaW5kZXgyXS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleDM6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChsb3dlclJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHlbaW5kZXgzXS5yZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGxvd2VyUmFyaXR5LmluZGV4T2YobG93ZXJSYXJpdHlbaW5kZXgzXSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNsaWNlKGluZGV4MywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGluZGV4MywgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIGxvd2VyUmFyaXR5W2luZGV4M10uaWQsIGxvd2VyUmFyaXR5W2luZGV4M10ubmV0SWQsIF9hdmF0YXIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLml0ZW1zLnNwbGljZSh0aGlzLml0ZW1zLmluZGV4T2YoX2l0ZW0pLCAxKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBlbnVtIENIQUxMRU5HRSB7XHJcbiAgICAgICAgVEhPUlNIQU1NRVJcclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBDaGFsbGVuZ2VSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgY2hhbGxlbmdlOiBDSEFMTEVOR0U7XHJcbiAgICAgICAgY2hhbGxlbmdlUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJjaGFsbGVuZ2VSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsdWVcIikpKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5DSEFMTEVOR0UpO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW15Q291bnRNYW5hZ2VyID0gbmV3IEVuZW15Q291bnRNYW5hZ2VyKDEwKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLmNoYWxsZW5nZVJvb21NYXQ7XHJcbiAgICAgICAgICAgIHRoaXMuY2hhbGxlbmdlID0gdGhpcy5yYW5kb21DaGFsbGVuZ2UoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCByYW5kb21DaGFsbGVuZ2UoKTogQ0hBTExFTkdFIHtcclxuICAgICAgICAgICAgbGV0IGluZGV4OiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAoT2JqZWN0LmtleXMoQ0hBTExFTkdFKS5sZW5ndGggLyAyIC0gMSkpO1xyXG4gICAgICAgICAgICByZXR1cm4gKDxhbnk+Q0hBTExFTkdFKVtDSEFMTEVOR0VbaW5kZXhdXTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmVuZW15Q291bnRNYW5hZ2VyLmZpbmlzaGVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc3dpdGNoICh0aGlzLmNoYWxsZW5nZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIENIQUxMRU5HRS5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc3RvcFRob3JzSGFtbWVyQ2hhbGxlbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jaGFsbGVuZ2UpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIENIQUxMRU5HRS5USE9SU0hBTU1FUjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydFRob3JzSGFtbWVyQ2hhbGxlbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXJ0VGhvcnNIYW1tZXJDaGFsbGVuZ2UoKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogYWN0aXZhdGVcclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMuZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgLy8gICAgIHJldHVybjtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIxLndlYXBvbi5jYW5TaG9vdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmNhblNob290ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBsZXQgdGhvcnNoYW1tZXI6IEl0ZW1zLkludGVybmFsSXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgbGV0IGNob29zZW5PbmU6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY2hvb3Nlbk9uZSA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNob29zZW5PbmUgPSBHYW1lLmF2YXRhcjI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRob3JzaGFtbWVyLmFkZEl0ZW1Ub0VudGl0eShjaG9vc2VuT25lKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkodHJ1ZSwgdGhvcnNoYW1tZXIuaWQsIHRob3JzaGFtbWVyLm5ldElkLCBjaG9vc2VuT25lLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIxLndlYXBvbiwgR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIyLndlYXBvbiwgR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzdG9wVGhvcnNIYW1tZXJDaGFsbGVuZ2UoKSB7XHJcbiAgICAgICAgICAgIGxldCBhdmF0YXIxSW52ID0gR2FtZS5hdmF0YXIxLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgIGxldCBhdmF0YXIySW52ID0gR2FtZS5hdmF0YXIyLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXZhdGFyMUludiAhPSB1bmRlZmluZWQgfHwgYXZhdGFyMkludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhdmF0YXIxSW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5zcGxpY2UoR2FtZS5hdmF0YXIxLml0ZW1zLmluZGV4T2YoYXZhdGFyMUludiksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBhdmF0YXIxSW52LmlkLCBhdmF0YXIxSW52Lm5ldElkLCBHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJ1bGxldHMuQlVMTEVUVFlQRSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJidWxsZXRUeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0aWxlQW1vdW50XCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhdmF0YXIySW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5zcGxpY2UoR2FtZS5hdmF0YXIyLml0ZW1zLmluZGV4T2YoYXZhdGFyMkludiksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBhdmF0YXIySW52LmlkLCBhdmF0YXIySW52Lm5ldElkLCBHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJ1bGxldHMuQlVMTEVUVFlQRSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJidWxsZXRUeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0aWxlQW1vdW50XCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmNhblNob290ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uY2FuU2hvb3QgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMS53ZWFwb24sIEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihHYW1lLmF2YXRhcjIud2VhcG9uLCBHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcm9vbUludiA9IEdhbWUuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyb29tSW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcm9vbUludi5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXYWxsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuV0FMTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyBkb29yOiBEb29yO1xyXG4gICAgICAgIHByaXZhdGUgbm9ybWFsOiBHYW1lLsaSLlZlY3RvcjM7IGdldCBnZXROb3JtYWwoKTogR2FtZS7Gki5WZWN0b3IzIHsgcmV0dXJuIHRoaXMubm9ybWFsIH07XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3M6IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxpbmc6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb206IFJvb20pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyTGl0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJyZWRcIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1BvcyA9IF9wb3MudG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBfc2NhbGluZy50b1ZlY3RvcjMoMSk7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKF9wb3MueCAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygtMSwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9wb3MueCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoMSwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy55ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygwLCAtMSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9wb3MueSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoMCwgMSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBhZGREb29yKF9wb3M6IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxpbmc6IEdhbWUuxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICB0aGlzLmRvb3IgPSBuZXcgRG9vcigpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuZG9vcik7XHJcblxyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoX3Bvcy54KSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMygxLCBfc2NhbGluZy54IC8gX3NjYWxpbmcueSAqIDMsIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IHRydWUsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVgoLTAuNSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWCgwLjUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF9zY2FsaW5nLnkgLyBfc2NhbGluZy54ICogMywgMSwgMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy55ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiB0cnVlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWSgtMC41KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IHRydWUsIHdlc3Q6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVZKDAuNSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi55LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueCwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5ET09SO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcblxyXG4gICAgICAgIHB1YmxpYyBkaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiRG9vclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiZ3JlZW5cIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VEb29yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRDb2xsaWRlcigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnksIHRoaXMubXR4V29ybGQuc2NhbGluZy54LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2hhbmdlUm9vbSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3dpdGNoUm9vbVJlcXVlc3QodGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb3BlbkRvb3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvc2VEb29yKCkge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgT2JzaXRjYWwgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5PQlNUSUNBTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBwYXJlbnRSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogUm9vbSwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF9zY2FsZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiT2JzdGljYWxcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhcmVudFJvb20gPSBfcGFyZW50O1xyXG4gICAgICAgICAgICB0aGlzLnBhcmVudFJvb20ub2JzdGljYWxzLnB1c2godGhpcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcImJsYWNrXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsYWNrXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKEdhbWUuxpIuVmVjdG9yMy5PTkUoX3NjYWxlKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSA1O1xyXG4gICAgZXhwb3J0IGxldCBnZW5lcmF0aW9uRmFpbGVkID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZU5vcnRoOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigwLCAxKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlRWFzdDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoMSwgMCk7XHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZVNvdXRoOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigwLCAtMSk7XHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZVdlc3Q6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKC0xLCAwKTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDMwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwcm9jZWR1YWxSb29tR2VuZXJhdGlvbigpIHtcclxuICAgICAgICByb29tcyA9IFtdO1xyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSBmYWxzZTtcclxuICAgICAgICByb29tcy5wdXNoKGdlbmVyYXRlU3RhcnRSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2guYXBwbHkocm9vbXMsIGdlbmVyYXRlTm9ybWFsUm9vbXMoKSk7XHJcbiAgICAgICAgYWRkQm9zc1Jvb20oKTtcclxuICAgICAgICByb29tcy5wdXNoLmFwcGx5KHJvb21zLCBnZW5lcmF0ZVRyZWFzdXJlUm9vbSgpKTtcclxuICAgICAgICByb29tcy5wdXNoKGdlbmVyYXRlTWVyY2hhbnRSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVDaGFsbGVuZ2VSb29tKCkpO1xyXG4gICAgICAgIHNldEV4aXRzKCk7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHsgY29uc29sZS5sb2cocm9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5jbG9uZS50b1N0cmluZygpKSB9KTtcclxuICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMocm9vbXNbMF0pO1xyXG5cclxuXHJcbiAgICAgICAgc2V0RXhpdHMoKTtcclxuICAgICAgICBhZGRSb29tVG9HcmFwaChyb29tc1swXSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGdlbmVyYXRlcyBhIGdyaWQgdGhhdHMgY29ubmVjdGVkIHRvZ2dldGhlciBmcm9tIGEgZ2l2ZW4gc3RhcnRpbmcgcG9pbnRcclxuICAgICAqIEBwYXJhbSBfc3RhcnRDb29yZCB0aGUgc3RhcnRpbmcgcG9pbnRcclxuICAgICAqIEByZXR1cm5zIHZlY3RvcjIgYXJyYXkgb2YgYSBjb25uZWN0aW5nIGdyaWQgd2l0aG91dCBvdmVybGFwc1xyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVNuYWtlR3JpZChfc3RhcnRDb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBncmlkOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIGdyaWQucHVzaChfc3RhcnRDb29yZCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZlJvb21zOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoZ3JpZCwgZ3JpZFtncmlkLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgaWYgKG5leHRDb29yZCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZ3JpZC5wdXNoKG5leHRDb29yZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGdyaWQ7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGZ1bmN0aW9uIHRvIGdldCBhIHJhbmRvbSBuZWlnaWhib3VyIHRha2luZyBjYXJlIG9mIGFuIGFjdXRhbCBncmlkXHJcbiAgICAgKiBAcGFyYW0gX2dyaWQgZXhpc3RpbmcgZ3JpZCB0aGUgZnVuY3Rpb24gc2hvdWxkIGNhcmUgYWJvdXRcclxuICAgICAqIEBwYXJhbSBfc3BlY2lmaWNDb29yZCB0aGUgY29vcmQgeW91IHdhbnQgdGhlIG5leHQgcG9zc2libGUgY29vcmQgXHJcbiAgICAgKiBAcmV0dXJucyBhIHZlY3RvcjIgY29vcmQgdGhhdHMgbm90IGluc2lkZSBvZiBfZ3JpZCBhbmQgYXJvdW5kICBfc3BlY2lmaWNDb29yZFxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKF9ncmlkOiBHYW1lLsaSLlZlY3RvcjJbXSwgX3NwZWNpZmljQ29vcmQ6IEdhbWUuxpIuVmVjdG9yMik6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgbGV0IGNvb3JkTmVpZ2hib3VyczogR2FtZS7Gki5WZWN0b3IyW10gPSBnZXROZWlnaGJvdXJDb29yZGluYXRlKF9zcGVjaWZpY0Nvb3JkKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvb3JkTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgcmFuZG9tSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAoY29vcmROZWlnaGJvdXJzLmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGNvb3JkTmVpZ2hib3Vyc1tyYW5kb21JbmRleF07XHJcbiAgICAgICAgICAgIGlmIChfZ3JpZC5maW5kKGNvb3JkID0+IGNvb3JkLmVxdWFscyhuZXh0Q29vcmQpKSkge1xyXG4gICAgICAgICAgICAgICAgY29vcmROZWlnaGJvdXJzID0gY29vcmROZWlnaGJvdXJzLmZpbHRlcihjb29yZCA9PiAhY29vcmQuZXF1YWxzKG5leHRDb29yZCkpO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dENvb3JkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgYWxsIG5laWdoYm91cnMgaWdub3JpbmcgdGhlIGN1cnJlbnQgZ3JpZFxyXG4gICAgICogQHBhcmFtIF9jb29yZCBjb29yZGlhbnRlIHlvdSB3YW50IHRoZSBuZWlnaGJvdXIgZnJvbVxyXG4gICAgICogQHJldHVybnMgNCBuZWlnaGJvdXJzIGluIGRpcmVjdGlvbiBOIEUgUyBhbmQgV1xyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJDb29yZGluYXRlKF9jb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCArIDEsIF9jb29yZC55KSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54IC0gMSwgX2Nvb3JkLnkpKTtcclxuXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54LCBfY29vcmQueSArIDEpKTtcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLngsIF9jb29yZC55IC0gMSkpO1xyXG4gICAgICAgIHJldHVybiBuZWlnaGJvdXJzO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlU3RhcnRSb29tKCk6IFN0YXJ0Um9vbSB7XHJcbiAgICAgICAgbGV0IHN0YXJ0Um9vbTogU3RhcnRSb29tID0gbmV3IFN0YXJ0Um9vbShuZXcgxpIuVmVjdG9yMigwLCAwKSwgMjApO1xyXG4gICAgICAgIHJldHVybiBzdGFydFJvb207XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVOb3JtYWxSb29tcygpOiBOb3JtYWxSb29tW10ge1xyXG4gICAgICAgIGxldCBncmlkQ29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXTtcclxuICAgICAgICBsZXQgbm9ybWFsUm9vbXM6IE5vcm1hbFJvb21bXSA9IFtdO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGdyaWRDb29yZHMgPSBnZW5lcmF0ZVNuYWtlR3JpZChyb29tc1swXS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgICAgIGlmICgoZ3JpZENvb3Jkcy5sZW5ndGggLSAxKSA9PSBudW1iZXJPZlJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBncmlkQ29vcmRzLmZvckVhY2goY29vcmQgPT4ge1xyXG4gICAgICAgICAgICBub3JtYWxSb29tcy5wdXNoKG5ldyBOb3JtYWxSb29tKGNvb3JkLCAyMCkpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIG5vcm1hbFJvb21zO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEJvc3NSb29tKCkge1xyXG4gICAgICAgIGxldCBiaWdnZXN0RGlzdGFuY2U6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhyb29tLmNvb3JkaW5hdGVzLngpID4gYmlnZ2VzdERpc3RhbmNlLnggJiYgTWF0aC5hYnMocm9vbS5jb29yZGluYXRlcy55KSA+IGJpZ2dlc3REaXN0YW5jZS55KSB7XHJcbiAgICAgICAgICAgICAgICBiaWdnZXN0RGlzdGFuY2UgPSByb29tLmNvb3JkaW5hdGVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICBsZXQgcm9vbUNvb3JkOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldENvb3Jkc0Zyb21Sb29tcygpO1xyXG4gICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZCwgcm9vbUNvb3JkW3Jvb21Db29yZC5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgaWYgKG5leHRDb29yZCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy8gbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChyb29tQ29vcmQsIHJvb21Db29yZFtyb29tQ29vcmQubGVuZ3RoIC0gMl0pO1xyXG4gICAgICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJvb21zLnB1c2gobmV3IEJvc3NSb29tKG5leHRDb29yZCwgMzApKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVUcmVhc3VyZVJvb20oKTogVHJlYXN1cmVSb29tW10ge1xyXG4gICAgICAgIGxldCByb29tQ29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldENvb3Jkc0Zyb21Sb29tcygpO1xyXG4gICAgICAgIGxldCBuZXdUcmVhc3VyZVJvb21zOiBUcmVhc3VyZVJvb21bXSA9IFtdXHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgaWYgKHJvb20ucm9vbVR5cGUgPT0gUk9PTVRZUEUuTk9STUFMKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChyb29tQ29vcmRzLCByb29tLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDb29yZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdHJSb29tID0gbmV3IFRyZWFzdXJlUm9vbShuZXh0Q29vcmQsIDEwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0clJvb20uZ2V0U3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1RyZWFzdXJlUm9vbXMucHVzaCh0clJvb20pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIG5ld1RyZWFzdXJlUm9vbXM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVNZXJjaGFudFJvb20oKTogTWVyY2hhbnRSb29tIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoZ2V0Q29vcmRzRnJvbVJvb21zKCksIHJvb21zW2ldLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDb29yZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1lcmNoYW50Um9vbShuZXh0Q29vcmQsIDIwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNoYWxsZW5nZVJvb20oKTogQ2hhbGxlbmdlUm9vbSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKGdldENvb3Jkc0Zyb21Sb29tcygpLCByb29tc1tpXS5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgICAgIGlmIChuZXh0Q29vcmQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDaGFsbGVuZ2VSb29tKG5leHRDb29yZCwgMjApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgY29vcmRpYW50ZXMgZnJvbSBhbGwgZXhpc3Rpbmcgcm9vbXNcclxuICAgICAqIEByZXR1cm5zIFZlY3RvcjIgYXJyYXkgd2l0aCBjb29yZGluYXRlcyBvZiBhbGwgY3VycmVudCBleGlzdGluZyByb29tcyBpbiBSb29tR2VuZXJhdGlvbi5yb29tc1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Q29vcmRzRnJvbVJvb21zKCk6IEdhbWUuxpIuVmVjdG9yMltdIHtcclxuICAgICAgICBsZXQgY29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGNvb3Jkcy5wdXNoKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIGNvb3Jkc1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldEV4aXRzKCkge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBuZWlnaGJvdXJzID0gcm9vbXMuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudCAhPSByb29tKTtcclxuICAgICAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG5laWdoYm91ciA9PiB7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFJvb21FeGl0KG5laWdoYm91cik7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFNwYXduUG9pbnRzKCk7XHJcbiAgICAgICAgICAgICAgICByb29tLm9wZW5Eb29ycygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhfZmlyc3RSb29tOiBSb29tKSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91ck46IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMihfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLngsIChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkgKyAxKSkpKTtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyRTogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnggKyAxKSwgX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55KSkpO1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJTOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54LCAoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55IC0gMSkpKSk7XHJcbiAgICAgICAgbGV0IG5laWdoYm91clc6IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMigoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54IC0gMSksIF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSkpKTtcclxuICAgICAgICBpZiAobmVpZ2hib3VyTiAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91ck4ucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91ck4ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJOLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJOLnJvb21TaXplIC8gMiksIG5laWdoYm91ck4uY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ck4ucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJOLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJOKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm91ckUgIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJFLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJFLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyRS5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyRS5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJFLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyRS5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvdXJTICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyUy5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyUy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91clMuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clMucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyUy5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyUy5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91clMucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91clMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3VyVyAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91clcucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91clcubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJXLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJXLnJvb21TaXplIC8gMiksIG5laWdoYm91clcuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clcucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJXLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJXKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb20oX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20uZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Jvb206IFJvb207XHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55ICsgMSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50UztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCArIDEsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50VztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uc291dGgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkgLSAxKSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnROO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLndlc3QpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gMSwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55KSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnRFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChuZXdSb29tID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIm5vIHJvb20gZm91bmRcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIC8vIEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb24udG9WZWN0b3IzKEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnopO1xyXG5cclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgobmV3Um9vbSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiByZW1vdmVzIGVyeXRoaW5nIHVucmVsaWFibGUgZnJvbSB0aGUgZ3JwYWggYW5kIGFkZHMgdGhlIG5ldyByb29tIHRvIHRoZSBncmFwaCAsIHNlbmRpbmcgaXQgdG8gdGhlIGNsaWVudCAmIHNwYXducyBlbmVtaWVzIGlmIGV4aXN0aW5nIGluIHJvb21cclxuICAgICAqIEBwYXJhbSBfcm9vbSB0aGUgcm9vbSBpdCBzaG91bGQgc3Bhd25cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZFJvb21Ub0dyYXBoKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5zZW5kUm9vbSg8SW50ZXJmYWNlcy5JUm9vbT57IGNvb3JkaW5hdGVzOiBfcm9vbS5jb29yZGluYXRlcywgcm9vbVNpemU6IF9yb29tLnJvb21TaXplLCBleGl0czogX3Jvb20uZXhpdHMsIHJvb21UeXBlOiBfcm9vbS5yb29tVHlwZSwgdHJhbnNsYXRpb246IF9yb29tLm10eExvY2FsLnRyYW5zbGF0aW9uIH0pO1xyXG5cclxuICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKCg8YW55PmVsZW0pLnRhZyAhPSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgIG9sZE9iamVjdHMgPSBvbGRPYmplY3RzLmZpbHRlcihlbGVtID0+ICgoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5VSSkpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgR2FtZS52aWV3cG9ydC5jYWxjdWxhdGVUcmFuc2Zvcm1zKCk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBfcm9vbS5vbkFkZFRvR3JhcGgoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIF9yb29tLndhbGxzLmZvckVhY2god2FsbCA9PiB7XHJcbiAgICAgICAgICAgIHdhbGwuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgaWYgKHdhbGwuZG9vciAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHdhbGwuZG9vci5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgR2FtZS5jdXJyZW50Um9vbSA9IF9yb29tO1xyXG4gICAgICAgIEVuZW15U3Bhd25lci5zcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbShHYW1lLmN1cnJlbnRSb29tLmVuZW15Q291bnRNYW5hZ2VyLmdldE1heEVuZW15Q291bnQsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNoYWRvdzogR2FtZS7Gki5UZXh0dXJlSW1hZ2UgPSBuZXcgR2FtZS7Gki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBjbGFzcyBTaGFkb3cgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHByaXZhdGUgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBzaGFkb3dNYXR0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U2hhZG93KSk7XHJcbiAgICAgICAgc2hhZG93UGFyZW50OiBHYW1lLsaSLk5vZGU7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogR2FtZS7Gki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwic2hhZG93XCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWRvd1BhcmVudCA9IF9wYXJlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zaGFkb3dNYXR0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfcGFyZW50Lm10eExvY2FsLnRyYW5zbGF0aW9uLngsIF9wYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgLTAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKDIsIDIsIDIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlU2hhZG93UG9zKCkge1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgdGhpcy5zaGFkb3dQYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueiotMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFdlYXBvbnMge1xyXG4gICAgZXhwb3J0IGNsYXNzIFdlYXBvbiB7XHJcbiAgICAgICAgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgY29vbGRvd246IEFiaWxpdHkuQ29vbGRvd247IGdldCBnZXRDb29sRG93bigpIHsgcmV0dXJuIHRoaXMuY29vbGRvd24gfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXR0YWNrQ291bnQ6IG51bWJlcjsgZ2V0IGdldEF0dGFja0NvdW50KCkgeyByZXR1cm4gdGhpcy5hdHRhY2tDb3VudCB9O1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlcjtcclxuICAgICAgICBhaW1UeXBlOiBBSU07XHJcbiAgICAgICAgYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFID0gQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJEO1xyXG4gICAgICAgIHByb2plY3RpbGVBbW91bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY2FuU2hvb3QgPSB0cnVlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vbGRvd25UaW1lOiBudW1iZXIsIF9hdHRhY2tDb3VudDogbnVtYmVyLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfcHJvamVjdGlsZUFtb3VudDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYWltVHlwZTogQUlNKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrQ291bnQgPSBfYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFR5cGUgPSBfYnVsbGV0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aWxlQW1vdW50ID0gX3Byb2plY3RpbGVBbW91bnQ7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFpbVR5cGUgPSBfYWltVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bihfY29vbGRvd25UaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY2l0b246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhblNob290KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgPCAxMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5hY2N1cmFjeShfZGlyZWNpdG9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IHRoaXMubG9hZE1hZ2F6aW5lKF9wb3NpdGlvbiwgX2RpcmVjaXRvbiwgdGhpcy5idWxsZXRUeXBlLCBfYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1bGxldERpcmVjdGlvbihtYWdhemluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zZXRNYXhDb29sRG93biA9IHRoaXMuY29vbGRvd24uZ2V0TWF4Q29vbERvd24gKiB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWNpdG9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmFjY3VyYWN5KF9kaXJlY2l0b246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjaXRvbi54ID0gX2RpcmVjaXRvbi54ICsgTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5IC0gTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5O1xyXG4gICAgICAgICAgICBfZGlyZWNpdG9uLnkgPSBfZGlyZWNpdG9uLnkgKyBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgLSBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmaXJlKF9tYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIF9tYWdhemluZS5mb3JFYWNoKGJ1bGxldCA9PiB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0IGluc3RhbmNlb2YgQnVsbGV0cy5Ib21pbmdCdWxsZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkLCAoPEJ1bGxldHMuSG9taW5nQnVsbGV0PmJ1bGxldCkudGFyZ2V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWxsZXREaXJlY3Rpb24oX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX21hZ2F6aW5lLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZE1hZ2F6aW5lKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX25ldElkPzogbnVtYmVyKTogQnVsbGV0cy5CdWxsZXRbXSB7XHJcbiAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucHJvamVjdGlsZUFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQodGhpcy5idWxsZXRUeXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMub3duZXJOZXRJZCwgX25ldElkKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uSE9NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldCh0aGlzLmJ1bGxldFR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lck5ldElkLCBudWxsLCBfbmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG1hZ2F6aW5lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBBSU0ge1xyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuXHJcbn0iXX0=