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
                    if (_avatar instanceof Player.Ranged) {
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
                    }
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
            this.addEventListener("renderPrepare" /* RENDER_PREPARE */, this.eventUpdate);
        }
        eventUpdate = (_event) => {
            this.update();
        };
        update() {
            this.predict();
        }
        predict() {
            if (Networking.client.idHost != Networking.client.id && this.owner == Game.avatar1) {
                this.clientPrediction.update();
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
            if (this.texturePath != "" || this.texturePath != null) {
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
            Networking.client.dispatch({ route: undefined, idTarget: Networking.clients.find(elem => elem.id != Networking.client.id).id, content: { text: FUNCTION.UPDATEINVENTORY, add: _add, itemId: _itemId, itemNetId: _itemNetId, netId: _netId } });
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
        attack(_direction, _netId, _sync) {
            this.weapon.shoot(this.mtxLocal.translation.toVector2(), _direction, _netId, _sync);
        }
        //Block
        doAbility() {
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
            switch (this.challenge) {
                case CHALLENGE.THORSHAMMER:
                    this.startThorsHammerChallenge();
                    break;
                default:
                    break;
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
            choosenOne.items.push(thorshammer);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiTWFpbi5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL0NsYXNzZXMvTWFpbi50cyIsIi4uL0NsYXNzZXMvVUkudHMiLCIuLi9DbGFzc2VzL1RhZy50cyIsIi4uL0NsYXNzZXMvRW50aXR5LnRzIiwiLi4vQ2xhc3Nlcy9FbmVteS50cyIsIi4uL0NsYXNzZXMvSW50ZXJmYWNlcy50cyIsIi4uL0NsYXNzZXMvSXRlbXMudHMiLCIuLi9DbGFzc2VzL0FuaW1hdGlvbkdlbmVyYXRpb24udHMiLCIuLi9DbGFzc2VzL1ByZWRpY3Rpb24udHMiLCIuLi9DbGFzc2VzL0FiaWxpdHkudHMiLCIuLi9DbGFzc2VzL0FyZWFPZkVmZmVjdC50cyIsIi4uL0NsYXNzZXMvQXR0cmlidXRlcy50cyIsIi4uL0NsYXNzZXMvQm9zcy50cyIsIi4uL0NsYXNzZXMvQnVmZi50cyIsIi4uL0NsYXNzZXMvQnVsbGV0LnRzIiwiLi4vQ2xhc3Nlcy9Db2xsaWRlci50cyIsIi4uL0NsYXNzZXMvRW5lbXlTcGF3bmVyLnRzIiwiLi4vQ2xhc3Nlcy9GbG9ja2luZy50cyIsIi4uL0NsYXNzZXMvRnJpZW5kbHlDcmVhdHVyZXMudHMiLCIuLi9DbGFzc2VzL0dhbWVDYWxjdWxhdGlvbi50cyIsIi4uL0NsYXNzZXMvSW5wdXRTeXN0ZW0udHMiLCIuLi9DbGFzc2VzL0xhbmRzY2FwZS50cyIsIi4uL0NsYXNzZXMvTWluaW1hcC50cyIsIi4uL0NsYXNzZXMvTmV0d29ya2luZy50cyIsIi4uL0NsYXNzZXMvUGxheWVyLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tLnRzIiwiLi4vQ2xhc3Nlcy9Sb29tR2VuZXJhdGlvbi50cyIsIi4uL0NsYXNzZXMvU2hhZG93LnRzIiwiLi4vQ2xhc3Nlcy9XZWFwb25zLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQSxtQkFBbUI7QUFDbkIsd0RBQXdEO0FBQ3hELHNEQUFzRDtBQUN0RCxzQkFBc0I7QUFFdEIsSUFBVSxJQUFJLENBbWNiO0FBeGNELG1CQUFt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LEVBQUUsQ0FBQyxTQUFTLEVBQUUsTUFBTSxFQUFFLG9CQUFBLGdCQUFnQixFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUUzRixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUV4RixRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQUEsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxRQUFRLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsb0JBQUEsV0FBVyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztRQUMzRSxVQUFVLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUUsb0JBQUEsYUFBYSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVuRixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixZQUFZLEdBQUcsSUFBSSxnQkFBZ0IsQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLFFBQVEsRUFBRSxNQUFNLEVBQUUsb0JBQUEsZUFBZSxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUN4RixjQUFjLEdBQUcsSUFBSSxnQkFBZ0Is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QUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQSxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUM3SSxNQUFNO2dCQUNWLEtBQUssVUFBVSxDQUFDLFFBQVEsQ0FBQyxRQUFRO29CQUM3QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQSxZQUFZLENBQUMsQ0FBQyxDQUFDO29CQUM3SSxNQUFNO2dCQUNWLEtBQUssVUFBVSxDQUFDLFFBQVEsQ0FBQyxTQUFTO29CQUM5QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsR0FBQSxhQUFhLENBQUMsQ0FBQyxDQUFDO29CQUM5SSxNQUFNO2dCQUNWLEtBQUssVUFBVSxDQUFDLFFBQVEsQ0FBQyxJQUFJO29CQUN6QixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixFQUFFLElBQUksQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUs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RCxTQUFTLHFCQUFxQixDQUFDLFVBQWdCO1FBQzNDLElBQUksVUFBVSxHQUFTLFdBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdKLElBQUksVUFBVSxHQUFTLFdBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdKLElBQUksVUFBVSxHQUFTLFdBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdKLElBQUksVUFBVSxHQUFTLFdBQUEsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFDLElBQUksSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsVUFBVSxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzdKLElBQUksVUFBVSxJQUFJLFNBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7WUFDeEQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2TixVQUFVLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUNsQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNyQztRQUNELElBQUksVUFBVSxJQUFJLFNBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7WUFDeEQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2TixVQUFVLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUNsQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNyQztRQUNELElBQUksVUFBVSxJQUFJLFNBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7WUFDeEQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2TixVQUFVLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUNsQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNyQztRQUNELElBQUksVUFBVSxJQUFJLFNBQVMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxlQUFlLEVBQUU7WUFDeEQsVUFBVSxDQUFDLFFBQVEsQ0FBQyxXQUFXLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxXQUFXLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLEdBQUcsVUFBVSxDQUFDLFFBQVEsR0FBRyxDQUFDLENBQUMsRUFBRSxVQUFVLENBQUMsV0FBVyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxRQUFRLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2TixVQUFVLENBQUMsZUFBZSxHQUFHLElBQUksQ0FBQztZQUNsQyxxQkFBcUIsQ0FBQyxVQUFVLENBQUMsQ0FBQztTQUNyQztJQUNMLENBQUM7SUFFRCxTQUFnQixVQUFVLENBQUMsVUFBaUM7UUFDeEQsSUFB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O3dCQUNYLFFBQVEsQ0FBQyxJQUFJLENBQUMsSUFBSSxPQUFPLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsU0FBUyxFQUFFLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVSxFQUFFLElBQUksRUFBRSxNQUFNLENBQUMsQ0FBQyxDQUFDO3dCQUMvRyxNQUFNO2lCQUNiO2FBQ0o7WUFDRCxPQUFPLFFBQVEsQ0FBQztRQUNwQixDQUFDO0tBQ0o7SUF2R1ksY0FBTSxTQXVHbEIsQ0FBQTtJQUVELElBQVksR0FHWDtJQUhELFdBQVksR0FBRztRQUNYLGlDQUFNLENBQUE7UUFDTixpQ0FBTSxDQUFBO0lBQ1YsQ0FBQyxFQUhXLEdBQUcsR0FBSCxXQUFHLEtBQUgsV0FBRyxRQUdkO0FBRUwsQ0FBQyxFQS9HUyxPQUFPLEtBQVAsT0FBTyxRQStHaEIiLCJzb3VyY2VzQ29udGVudCI6WyIvLyNyZWdpb24gXCJJbXBvcnRzXCJcclxuLy8vPHJlZmVyZW5jZSB0eXBlcz1cIi4uL0ZVREdFL0NvcmUvQnVpbGQvRnVkZ2VDb3JlLmpzXCIvPlxyXG4vLy88cmVmZXJlbmNlIHR5cGVzPVwiLi4vRlVER0UvQWlkL0J1aWxkL0Z1ZGdlQWlkLmpzXCIvPlxyXG4vLyNlbmRyZWdpb24gXCJJbXBvcnRzXCJcclxuXHJcbm5hbWVzcGFjZSBHYW1lIHtcclxuICAgIGV4cG9ydCBlbnVtIEdBTUVTVEFURVMge1xyXG4gICAgICAgIFBMQVlJTkcsXHJcbiAgICAgICAgUEFVU0VcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW1wb3J0IMaSID0gRnVkZ2VDb3JlO1xyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gXCJEb21FbGVtZW50c1wiXHJcbiAgICBleHBvcnQgbGV0IGNhbnZhczogSFRNTENhbnZhc0VsZW1lbnQgPSA8SFRNTENhbnZhc0VsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDYW52YXNcIik7XHJcbiAgICAvLyB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgaW5pdCk7XHJcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcihcImxvYWRcIiwgc3RhcnQpO1xyXG5cclxuICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUmFuZ2VkXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBwbGF5ZXJDaG9pY2UpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJNZWxlZVwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgcGxheWVyQ2hvaWNlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcIkRvbUVsZW1lbnRzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQdWJsaWNWYXJpYWJsZXNcIlxyXG4gICAgZXhwb3J0IGxldCBnYW1lc3RhdGU6IEdBTUVTVEFURVMgPSBHQU1FU1RBVEVTLlBBVVNFO1xyXG4gICAgZXhwb3J0IGxldCB2aWV3cG9ydDogxpIuVmlld3BvcnQgPSBuZXcgxpIuVmlld3BvcnQoKTtcclxuICAgIGV4cG9ydCBsZXQgY21wQ2FtZXJhOiDGki5Db21wb25lbnRDYW1lcmEgPSBuZXcgxpIuQ29tcG9uZW50Q2FtZXJhKCk7XHJcbiAgICBleHBvcnQgbGV0IGdyYXBoOiDGki5Ob2RlID0gbmV3IMaSLk5vZGUoXCJHcmFwaFwiKTtcclxuXHJcbiAgICB2aWV3cG9ydC5pbml0aWFsaXplKFwiVmlld3BvcnRcIiwgZ3JhcGgsIGNtcENhbWVyYSwgY2FudmFzKTtcclxuXHJcbiAgICBleHBvcnQgbGV0IGF2YXRhcjE6IFBsYXllci5QbGF5ZXI7XHJcbiAgICBleHBvcnQgbGV0IGF2YXRhcjI6IFBsYXllci5QbGF5ZXI7XHJcblxyXG4gICAgZXhwb3J0IGxldCBjdXJyZW50Um9vbTogR2VuZXJhdGlvbi5Sb29tO1xyXG4gICAgZXhwb3J0IGxldCBtaW5pTWFwOiBVSS5NaW5pbWFwO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29ubmVjdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGRlbHRhVGltZTogbnVtYmVyO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgc2VydmVyUHJlZGljdGlvbkF2YXRhcjogTmV0d29ya2luZy5TZXJ2ZXJQcmVkaWN0aW9uO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY3VycmVudE5ldE9iajogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHNbXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgZW50aXRpZXM6IEVudGl0eS5FbnRpdHlbXSA9IFtdO1xyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzOiBFbmVteS5FbmVteVtdID0gW107XHJcbiAgICBleHBvcnQgbGV0IGJ1bGxldHM6IEJ1bGxldHMuQnVsbGV0W10gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29vbERvd25zOiBBYmlsaXR5LkNvb2xkb3duW10gPSBbXTtcclxuICAgIC8vSlNPTlxyXG4gICAgZXhwb3J0IGxldCBlbmVtaWVzSlNPTjogRW50aXR5LkVudGl0eVtdO1xyXG4gICAgZXhwb3J0IGxldCBpbnRlcm5hbEl0ZW1KU09OOiBJdGVtcy5JbnRlcm5hbEl0ZW1bXTtcclxuICAgIGV4cG9ydCBsZXQgYnVmZkl0ZW1KU09OOiBJdGVtcy5CdWZmSXRlbVtdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgZGFtYWdlQnVmZkpTT046IEJ1ZmYuRGFtYWdlQnVmZltdO1xyXG4gICAgZXhwb3J0IGxldCBhdHRyaWJ1dGVCdWZmSlNPTjogQnVmZi5BdHRyaWJ1dGVzQnVmZltdO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgYnVsbGV0c0pTT046IEJ1bGxldHMuQnVsbGV0W107XHJcbiAgICBleHBvcnQgbGV0IGxvYWRlZCA9IGZhbHNlO1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHVibGljVmFyaWFibGVzXCJcclxuXHJcbiAgICAvLyNyZWdpb24gXCJQcml2YXRlVmFyaWFibGVzXCJcclxuICAgIGNvbnN0IGRhbXBlcjogbnVtYmVyID0gMy41O1xyXG4gICAgLy8jZW5kcmVnaW9uIFwiUHJpdmF0ZVZhcmlhYmxlc1wiXHJcblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gXCJlc3NlbnRpYWxcIlxyXG4gICAgYXN5bmMgZnVuY3Rpb24gaW5pdCgpIHtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlWigyNSk7XHJcbiAgICAgICAgY21wQ2FtZXJhLm10eFBpdm90LnJvdGF0ZVkoMTgwKTtcclxuXHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAvLyBHZW5lcmF0aW9uLnJvb21zID0gR2VuZXJhdGlvbi5nZW5lcmF0ZU5vcm1hbFJvb21zKCk7XHJcbiAgICAgICAgICAgIEl0ZW1zLkl0ZW1HZW5lcmF0b3IuZmlsbFBvb2woKTtcclxuICAgICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgICAgIEdlbmVyYXRpb24ucHJvY2VkdWFsUm9vbUdlbmVyYXRpb24oKTtcclxuICAgICAgICAgICAgICAgIGlmICghR2VuZXJhdGlvbi5nZW5lcmF0aW9uRmFpbGVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJHRU5FUkFUSU9OIEZBSUxFRCAtPiBSRVNUQVJUIEdFTkVSQVRJT05cIik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2VydmVyUHJlZGljdGlvbkF2YXRhciA9IG5ldyBOZXR3b3JraW5nLlNlcnZlclByZWRpY3Rpb24obnVsbCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBncmFwaC5hcHBlbmRDaGlsZChhdmF0YXIxKTtcclxuXHJcbiAgICAgICAgxpJBaWQuYWRkU3RhbmRhcmRMaWdodENvbXBvbmVudHMoZ3JhcGgpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICBmaW5kR2FtZU9iamVjdHMoKTtcclxuICAgICAgICBkZWx0YVRpbWUgPSBHYW1lLsaSLkxvb3AudGltZUZyYW1lR2FtZSAqIDAuMDAxO1xyXG4gICAgICAgIHBhdXNlQ2hlY2soKTtcclxuICAgICAgICBHYW1lLmF2YXRhcjEucHJlZGljdCgpO1xyXG4gICAgICAgIGNhbWVyYVVwZGF0ZSgpO1xyXG5cclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyUG9zaXRpb24oR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwucm90YXRpb24pO1xyXG4gICAgICAgICAgICBzZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyLnVwZGF0ZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgVUkudXBkYXRlVUkoKTtcclxuXHJcbiAgICAgICAgZHJhdygpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGZpbmRHYW1lT2JqZWN0cygpOiB2b2lkIHtcclxuICAgICAgICBpdGVtcyA9IDxJdGVtcy5JdGVtW10+Z3JhcGguZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbWVudCA9PiAoPEl0ZW1zLkl0ZW0+ZWxlbWVudCkudGFnID09IFRhZy5UQUcuSVRFTSk7XHJcbiAgICAgICAgYnVsbGV0cyA9IDxCdWxsZXRzLkJ1bGxldFtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxCdWxsZXRzLkJ1bGxldD5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5CVUxMRVQpO1xyXG4gICAgICAgIGVudGl0aWVzID0gPEVudGl0eS5FbnRpdHlbXT5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbHRlcihjaGlsZCA9PiAoPEVudGl0eS5FbnRpdHk+Y2hpbGQpIGluc3RhbmNlb2YgRW50aXR5LkVudGl0eSk7XHJcbiAgICAgICAgZW5lbWllcyA9IDxFbmVteS5FbmVteVtdPmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgY3VycmVudFJvb20gPSAoPEdlbmVyYXRpb24uUm9vbT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChlbGVtID0+ICg8R2VuZXJhdGlvbi5Sb29tPmVsZW0pLnRhZyA9PSBUYWcuVEFHLlJPT00pKTtcclxuICAgICAgICBjdXJyZW50TmV0T2JqID0gc2V0TmV0T2JqKGdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gTmV0d29ya2luZy5pc05ldHdvcmtPYmplY3QoZWxlbSkpKTtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzZXROZXRPYmooX25ldE9qOiBHYW1lLsaSLk5vZGVbXSk6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzW10ge1xyXG4gICAgICAgIGxldCB0ZW1wTmV0T2JqczogSW50ZXJmYWNlcy5JTmV0d29ya09iamVjdHNbXSA9IFtdO1xyXG4gICAgICAgIF9uZXRPai5mb3JFYWNoKG9iaiA9PiB7XHJcbiAgICAgICAgICAgIHRlbXBOZXRPYmpzLnB1c2goPEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzPnsgbmV0SWQ6IE5ldHdvcmtpbmcuZ2V0TmV0SWQob2JqKSwgbmV0T2JqZWN0Tm9kZTogb2JqIH0pXHJcbiAgICAgICAgfSlcclxuICAgICAgICByZXR1cm4gdGVtcE5ldE9ianM7XHJcbiAgICB9XHJcblxyXG5cclxuXHJcbiAgICBmdW5jdGlvbiBzZXRDbGllbnQoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5yZWFkeVN0YXRlID09IE5ldHdvcmtpbmcuY2xpZW50LnNvY2tldC5PUEVOICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkUm9vbS50b0xvd2VyQ2FzZSgpICE9IFwibG9iYnlcIikge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNldENsaWVudCgpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7IHNldENsaWVudCgpIH0sIDEwMCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHJlYWR5U2F0ZSgpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnRzLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zZXRDbGllbnRSZWFkeSgpO1xyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4geyByZWFkeVNhdGUoKSB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydExvb3AoKSB7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkICE9IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAmJiBhdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmxvYWRlZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoR2FtZS5sb2FkZWQpIHtcclxuICAgICAgICAgICAgxpIuTG9vcC5zdGFydCjGki5MT09QX01PREUuVElNRV9HQU1FLCBkZWx0YVRpbWUpO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlVJXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHN0YXJ0TG9vcCgpO1xyXG4gICAgICAgICAgICB9LCAxMDApO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBzdGFydCgpIHtcclxuICAgICAgICBsb2FkVGV4dHVyZXMoKTtcclxuICAgICAgICAvLyBsb2FkSlNPTigpO1xyXG5cclxuICAgICAgICAvL1RPRE86IGFkZCBzcHJpdGUgdG8gZ3JhcGhlIGZvciBzdGFydHNjcmVlblxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRHYW1lXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiU3RhcnRzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcblxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLmNvbm5lY3RpbmcoKTtcclxuICAgICAgICAgICAgbG9hZEpTT04oKTtcclxuXHJcbiAgICAgICAgICAgIHdhaXRPbkNvbm5lY3Rpb24oKTtcclxuICAgICAgICAgICAgYXN5bmMgZnVuY3Rpb24gd2FpdE9uQ29ubmVjdGlvbigpIHtcclxuICAgICAgICAgICAgICAgIHNldENsaWVudCgpO1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5maWx0ZXIoZWxlbSA9PiBlbGVtLnJlYWR5ID09IHRydWUpLmxlbmd0aCA+PSAyICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSU1IT1NUXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYXdhaXQgaW5pdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25FbmVtaWVzKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELlJFRFRJQ0ssIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBhdmF0YXIxKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gRW5lbXlTcGF3bmVyLnNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKDUsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlTTUFTSCwgRW50aXR5LklELk9HRVIsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SLCBFbnRpdHkuSUQuU1VNTU9OT1IsIG5ldyDGki5WZWN0b3IyKDMsIDMpLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vI3JlZ2lvbiBpbml0IEl0ZW1zXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBsZXQgaXRlbTIgPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGl0ZW0yLnNldFBvc2l0aW9uKG5ldyDGki5WZWN0b3IyKC01LCAwKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gLy8gbGV0IGl0ZW0zID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShJdGVtcy5JVEVNSUQuU0NBTEVVUCwgbmV3IMaSLlZlY3RvcjIoLTIsIDApLCBudWxsKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gbGV0IHppcHphcCA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRFU1QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB6aXB6YXAuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIoNSwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyB6aXB6YXAuc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gZ3JhcGguYXBwZW5kQ2hpbGQoaXRlbTIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBncmFwaC5hcHBlbmRDaGlsZChpdGVtMyk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduUGxheWVyKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCByb29tSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBjb29yZHM6IEdhbWUuxpIuVmVjdG9yMltdID0gR2VuZXJhdGlvbi5nZXRDb29yZHNGcm9tUm9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBjb29yZHMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJvb21JbmZvcy5wdXNoKDxJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3M+eyBjb29yZHM6IGNvb3Jkc1tpXSwgcm9vbVR5cGU6IEdlbmVyYXRpb24ucm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMgPT0gY29vcmRzW2ldKS5yb29tVHlwZSB9KVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1pbmlNYXAgPSBuZXcgVUkuTWluaW1hcChyb29tSW5mb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBncmFwaC5hZGRDaGlsZChtaW5pTWFwKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgICAgICAgICBzdGFydExvb3AoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2V0VGltZW91dCh3YWl0T25Db25uZWN0aW9uLCAzMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuXHJcbiAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdFwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgTmV0d29ya2luZy5jcmVhdGVSb29tKTtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJKb2luXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcm9vbUlkOiBzdHJpbmcgPSAoPEhUTUxJbnB1dEVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tXCIpKS52YWx1ZTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuam9pblJvb20ocm9vbUlkKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICB1cGRhdGVSb29tcygpO1xyXG4gICAgICAgICAgICB3YWl0Rm9yTG9iYnkoKTtcclxuICAgICAgICAgICAgZnVuY3Rpb24gd2FpdEZvckxvYmJ5KCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50cy5sZW5ndGggPiAxICYmIE5ldHdvcmtpbmcuY2xpZW50LmlkUm9vbS50b0xvY2FsZUxvd2VyQ2FzZSgpICE9IFwibG9iYnlcIikge1xyXG4gICAgICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSG9zdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21JZFwiKS5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkxvYmJ5c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBjb25uZWN0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgd2FpdEZvckxvYmJ5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSwgMjAwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYXN5bmMgZnVuY3Rpb24gdXBkYXRlUm9vbXMoKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuc29ja2V0LnJlYWR5U3RhdGUgPT0gTmV0d29ya2luZy5jbGllbnQuc29ja2V0Lk9QRU4pIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLmdldFJvb21zKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXBkYXRlUm9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9LCAyMDApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCAoKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJTdGFydHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c1wiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4ge1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkNyZWRpdHNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJ2aXNpYmxlXCI7XHJcblxyXG4gICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tDcmVkaXRcIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiQ3JlZGl0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlN0YXJ0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gcGxheWVyQ2hvaWNlKF9lOiBFdmVudCkge1xyXG4gICAgICAgIGlmICgoPEhUTUxCdXR0b25FbGVtZW50Pl9lLnRhcmdldCkuaWQgPT0gXCJSYW5nZWRcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5SYW5nZWQoRW50aXR5LklELlJBTkdFRCwgbmV3IEVudGl0eS5BdHRyaWJ1dGVzKDEwMDAwLCA1LCA1LCAxLCAyLCA1LCAxLCA4MCkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoKDxIVE1MQnV0dG9uRWxlbWVudD5fZS50YXJnZXQpLmlkID09IFwiTWVsZWVcIikge1xyXG4gICAgICAgICAgICBhdmF0YXIxID0gbmV3IFBsYXllci5NZWxlZShFbnRpdHkuSUQuTUVMRUUsIG5ldyBFbnRpdHkuQXR0cmlidXRlcygxMDAwMCwgMSwgNSwgMSwgMiwgMTAsIDEsIDgwKSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiTG9iYnlzY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwiaGlkZGVuXCI7XHJcbiAgICAgICAgcmVhZHlTYXRlKCk7XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHBhdXNlQ2hlY2soKSB7XHJcbiAgICAgICAgaWYgKCh3aW5kb3cuc2NyZWVuWCA8IC13aW5kb3cuc2NyZWVuLmF2YWlsV2lkdGgpICYmICh3aW5kb3cuc2NyZWVuWSA8IC13aW5kb3cuc2NyZWVuLmF2YWlsSGVpZ2h0KSkge1xyXG4gICAgICAgICAgICBwYXVzZSh0cnVlLCBmYWxzZSk7XHJcblxyXG4gICAgICAgICAgICBzZXRUaW1lb3V0KCgpID0+IHtcclxuICAgICAgICAgICAgICAgIHBhdXNlQ2hlY2soKTtcclxuICAgICAgICAgICAgfSwgMTAwKTtcclxuICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICBwbGF5aW5nKHRydWUsIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBhdXNlKF9zeW5jOiBib29sZWFuLCBfdHJpZ2dlck9wdGlvbjogYm9vbGVhbikge1xyXG4gICAgICAgIGlmIChnYW1lc3RhdGUgPT0gR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGlmIChfc3luYykge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZXRHYW1lc3RhdGUoZmFsc2UpO1xyXG4gICAgICAgICAgICB9IGlmIChfdHJpZ2dlck9wdGlvbikge1xyXG4gICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJPcHRpb25zY3JlZW5cIikuc3R5bGUudmlzaWJpbGl0eSA9IFwidmlzaWJsZVwiO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBiYWNrID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJCYWNrT3B0aW9uXCIpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGJhY2tDbG9uZSA9IGJhY2suY2xvbmVOb2RlKHRydWUpO1xyXG5cclxuICAgICAgICAgICAgICAgIGJhY2sucGFyZW50Tm9kZS5yZXBsYWNlQ2hpbGQoYmFja0Nsb25lLCBiYWNrKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkJhY2tPcHRpb25cIikuYWRkRXZlbnRMaXN0ZW5lcihcImNsaWNrXCIsICgpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIk9wdGlvbnNjcmVlblwiKS5zdHlsZS52aXNpYmlsaXR5ID0gXCJoaWRkZW5cIjtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUEFVU0U7XHJcbiAgICAgICAgICAgIMaSLkxvb3Auc3RvcCgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcGxheWluZyhfc3luYzogYm9vbGVhbiwgX3RyaWdnZXJPcHRpb246IGJvb2xlYW4pIHtcclxuICAgICAgICBpZiAoZ2FtZXN0YXRlID09IEdBTUVTVEFURVMuUEFVU0UpIHtcclxuICAgICAgICAgICAgaWYgKF9zeW5jKSB7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNldEdhbWVzdGF0ZSh0cnVlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX3RyaWdnZXJPcHRpb24pIHtcclxuICAgICAgICAgICAgICAgIGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiT3B0aW9uc2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgPSBcImhpZGRlblwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGdhbWVzdGF0ZSA9IEdBTUVTVEFURVMuUExBWUlORztcclxuICAgICAgICAgICAgxpIuTG9vcC5jb250aW51ZSgpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiBsb2FkSlNPTigpIHtcclxuICAgICAgICBjb25zdCBsb2FkRW5lbXkgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9FbmVtaWVzU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZW5lbWllc0pTT04gPSAoPEVudGl0eS5FbnRpdHlbXT5sb2FkRW5lbXkuZW5lbWllcyk7XHJcblxyXG4gICAgICAgIGNvbnN0IGxvYWRJdGVtID0gYXdhaXQgKGF3YWl0IGZldGNoKFwiLi9SZXNvdXJjZXMvSXRlbVN0b3JhZ2UuanNvblwiKSkuanNvbigpO1xyXG4gICAgICAgIGludGVybmFsSXRlbUpTT04gPSAoPEl0ZW1zLkludGVybmFsSXRlbVtdPmxvYWRJdGVtLmludGVybmFsSXRlbXMpO1xyXG4gICAgICAgIGJ1ZmZJdGVtSlNPTiA9ICg8SXRlbXMuQnVmZkl0ZW1bXT5sb2FkSXRlbS5idWZmSXRlbXMpO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3QgbG9hZEJ1bGxldHMgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9CdWxsZXRTdG9yYWdlLmpzb25cIikpLmpzb24oKTtcclxuICAgICAgICBidWxsZXRzSlNPTiA9ICg8QnVsbGV0cy5CdWxsZXRbXT5sb2FkQnVsbGV0cy5zdGFuZGFyZEJ1bGxldHMpO1xyXG5cclxuICAgICAgICBjb25zdCBsb2FkQnVmZnMgPSBhd2FpdCAoYXdhaXQgZmV0Y2goXCIuL1Jlc291cmNlcy9CdWZmU3RvcmFnZS5qc29uXCIpKS5qc29uKCk7XHJcbiAgICAgICAgZGFtYWdlQnVmZkpTT04gPSAoPEJ1ZmYuRGFtYWdlQnVmZltdPmxvYWRCdWZmcy5kYW1hZ2VCdWZmKTtcclxuICAgICAgICBhdHRyaWJ1dGVCdWZmSlNPTiA9ICg8QnVmZi5BdHRyaWJ1dGVzQnVmZltdPmxvYWRCdWZmcy5hdHRyaWJ1dGVCdWZmKTtcclxuXHJcbiAgICAgICAgY29uc29sZS53YXJuKFwiYWxsIEpTT04gbG9hZGVkXCIpO1xyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFRleHR1cmVzKCkge1xyXG4gICAgICAgIGF3YWl0IEdlbmVyYXRpb24udHh0U3RhcnRSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Sb29tcy9tYXAwMS5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEJ1bGxldHMuYnVsbGV0VHh0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9Qcm9qZWN0aWxlcy9hcnJvdy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQnVsbGV0cy53YXRlckJhbGxUeHQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1Byb2plY3RpbGVzL3dhdGVyQmFsbC5wbmdcIilcclxuXHJcbiAgICAgICAgLy9VSVxyXG4gICAgICAgIGF3YWl0IFVJLnR4dFplcm8ubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlMC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0T25lLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTEucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFRvdy5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUyLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRUaHJlZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2Uvd2hpdGUzLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS50eHRGb3VyLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTQucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEZpdmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlNS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0U2l4LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTYucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dFNldmVuLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dEVpZ2h0LmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTgucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnR4dE5pbmUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL3doaXRlOS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHh0VGVuLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS93aGl0ZTEwLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgLy9VSSBwYXJ0aWNsZVxyXG4gICAgICAgIGF3YWl0IFVJLmhlYWxQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL2hlYWxpbmcucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnBvaXNvblBhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvcG9pc29uLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5idXJuUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9wb2lzb24ucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLmJsZWVkaW5nUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9ibGVlZGluZy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuc2xvd1BhcnRpY2xlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9QYXJ0aWNsZXMvc2xvdy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuaW1tdW5lUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9pbW11bmUucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBVSS5jb21tb25QYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL1Jhcml0eS9jb21tb24ucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLnJhcmVQYXJ0aWNsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvUGFydGljbGVzL1Jhcml0eS9yYXJlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5lcGljUGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvZXBpYy5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkubGVnZW5kYXJ5UGFydGljbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9SYXJpdHkvbGVnZW5kYXJ5LnBuZ1wiKTtcclxuXHJcblxyXG4gICAgICAgIGF3YWl0IEVudGl0eS50eHRTaGFkb3cubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL1BhcnRpY2xlcy9zaGFkb3cucG5nXCIpO1xyXG5cclxuICAgICAgICAvL01pbmltYXBcclxuICAgICAgICBhd2FpdCBVSS5ub3JtYWxSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9NaW5pbWFwL25vcm1hbC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkuY2hhbGxlbmdlUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9jaGFsbGVuZ2UucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IFVJLm1lcmNoYW50Um9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9tZXJjaGFudC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgVUkudHJlYXN1cmVSb29tLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9NaW5pbWFwL3RyZWFzdXJlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBVSS5ib3NzUm9vbS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvTWluaW1hcC9ib3NzLnBuZ1wiKTtcclxuXHJcblxyXG4gICAgICAgIC8vRU5FTVlcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dEJhdElkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvYmF0L2JhdElkbGUucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFJlZFRpY2tJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3RpY2svcmVkVGlja0lkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0UmVkVGlja1dhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvdGljay9yZWRUaWNrV2Fsay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U21hbGxUaWNrSWRsZS5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zbWFsbFRpY2svc21hbGxUaWNrSWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTbWFsbFRpY2tXYWxrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3NtYWxsVGljay9zbWFsbFRpY2tXYWxrLnBuZ1wiKTtcclxuXHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTa2VsZXRvbklkbGUubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc2tlbGV0b24vc2tlbGV0b25JZGxlLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFNrZWxldG9uV2Fsay5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9za2VsZXRvbi9za2VsZXRvbldhbGsucG5nXCIpO1xyXG5cclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dE9nZXJJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlcklkbGUucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0T2dlcldhbGsubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvb2dlci9vZ2VyV2Fsay5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRPZ2VyQXR0YWNrLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL29nZXIvb2dlckF0dGFjay5wbmdcIik7XHJcblxyXG4gICAgICAgIGF3YWl0IEFuaW1hdGlvbkdlbmVyYXRpb24udHh0U3VtbW9uZXJJZGxlLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9FbmVtaWVzL3N1bW1vbmVyL3N1bW1vbmVySWRsZS5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgQW5pbWF0aW9uR2VuZXJhdGlvbi50eHRTdW1tb25lclN1bW1vbi5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvRW5lbWllcy9zdW1tb25lci9zdW1tb25lclNtYXNoLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBBbmltYXRpb25HZW5lcmF0aW9uLnR4dFN1bW1vbmVyVGVsZXBvcnQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0VuZW1pZXMvc3VtbW9uZXIvc3VtbW9uZXJUZWxlcG9ydC5wbmdcIik7XHJcblxyXG5cclxuXHJcblxyXG4gICAgICAgIC8vSXRlbXNcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRJY2VCdWNrZXQubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2ljZUJ1Y2tldC5wbmdcIik7XHJcbiAgICAgICAgYXdhaXQgSXRlbXMudHh0RG1nVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL2RhbWFnZVVwLnBuZ1wiKTtcclxuICAgICAgICBhd2FpdCBJdGVtcy50eHRIZWFsdGhVcC5sb2FkKFwiLi9SZXNvdXJjZXMvSW1hZ2UvSXRlbXMvaGVhbHRoVXAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dFNwZWVkVXAubG9hZChcIi4vUmVzb3VyY2VzL0ltYWdlL0l0ZW1zL3NwZWVkVXAucG5nXCIpO1xyXG4gICAgICAgIGF3YWl0IEl0ZW1zLnR4dFRveGljUmVsYXRpb25zaGlwLmxvYWQoXCIuL1Jlc291cmNlcy9JbWFnZS9JdGVtcy90b3hpY1JlbGF0aW9uc2hpcC5wbmdcIik7XHJcblxyXG5cclxuICAgICAgICBBbmltYXRpb25HZW5lcmF0aW9uLmdlbmVyYXRlQW5pbWF0aW9uT2JqZWN0cygpO1xyXG5cclxuICAgICAgICAvL1RPRE86IFVTRSBUSElTXHJcbiAgICAgICAgLy8gY29uc29sZS5jbGVhcigpO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGRyYXcoKTogdm9pZCB7XHJcbiAgICAgICAgdmlld3BvcnQuZHJhdygpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYW1lcmFVcGRhdGUoKSB7XHJcbiAgICAgICAgbGV0IGRpcmVjdGlvbiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRShhdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKGRlbHRhVGltZSAqIGRhbXBlcik7XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKGF2YXRhcjEuY2xpZW50Lm1pblRpbWVCZXR3ZWVuVGlja3MgKiBkYW1wZXIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjbXBDYW1lcmEubXR4UGl2b3QudHJhbnNsYXRlKG5ldyDGki5WZWN0b3IzKC1kaXJlY3Rpb24ueCwgZGlyZWN0aW9uLnksIDApLCB0cnVlKTtcclxuICAgICAgICBtaW5pTWFwLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnggKyBtaW5pTWFwLm9mZnNldFgsIGNtcENhbWVyYS5tdHhQaXZvdC50cmFuc2xhdGlvbi55ICsgbWluaU1hcC5vZmZzZXRZLCAwKTtcclxuICAgIH1cclxuXHJcbiAgICDGki5Mb29wLmFkZEV2ZW50TGlzdGVuZXIoxpIuRVZFTlQuTE9PUF9GUkFNRSwgdXBkYXRlKTtcclxuICAgIC8vI2VuZHJlZ2lvbiBcImVzc2VudGlhbFwiXHJcblxyXG59XHJcbiIsIm5hbWVzcGFjZSBVSSB7XHJcbiAgICAvL2xldCBkaXZVSTogSFRNTERpdkVsZW1lbnQgPSA8SFRNTERpdkVsZW1lbnQ+ZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJVSVwiKTtcclxuICAgIGxldCBwbGF5ZXIxVUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUGxheWVyMVwiKTtcclxuICAgIGxldCBwbGF5ZXIyVUk6IEhUTUxEaXZFbGVtZW50ID0gPEhUTUxEaXZFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiUGxheWVyMlwiKTtcclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlVUkoKSB7XHJcbiAgICAgICAgLy9BdmF0YXIxIFVJXHJcbiAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIxVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIxLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAvL0ludmVudG9yeVVJXHJcbiAgICAgICAgdXBkYXRlSW52VUkoR2FtZS5hdmF0YXIxLml0ZW1zLCBwbGF5ZXIxVUkpO1xyXG5cclxuICAgICAgICAvL0F2YXRhcjIgVUlcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQpIHtcclxuICAgICAgICAgICAgKDxIVE1MRGl2RWxlbWVudD5wbGF5ZXIyVUkucXVlcnlTZWxlY3RvcihcIiNIUFwiKSkuc3R5bGUud2lkdGggPSAoR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzIC8gR2FtZS5hdmF0YXIyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzICogMTAwKSArIFwiJVwiO1xyXG5cclxuICAgICAgICAgICAgLy9JbnZlbnRvcnlVSVxyXG4gICAgICAgICAgICB1cGRhdGVJbnZVSShHYW1lLmF2YXRhcjIuaXRlbXMsIHBsYXllcjJVSSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiB1cGRhdGVJbnZVSShfaW52OiBJdGVtcy5JdGVtW10sIF91aTogSFRNTEVsZW1lbnQpIHtcclxuICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlbW92ZSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICBfaW52LmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW1nTmFtZSA9IGVsZW1lbnQuaW1nU3JjLnNwbGl0KFwiL1wiKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZW1vdmUgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIGlmIChyZW1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpbWdFbGVtZW50LnBhcmVudEVsZW1lbnQucmVtb3ZlKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgX2ludi5mb3JFYWNoKChlbGVtZW50KSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZWxlbWVudCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZXhzaXN0OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmltZ1NyYyA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgZXhzaXN0ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlYXJjaCBET01JbWcgZm9yIEl0ZW1cclxuICAgICAgICAgICAgICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLnF1ZXJ5U2VsZWN0b3JBbGwoXCJpbWdcIikuZm9yRWFjaCgoaW1nRWxlbWVudCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGltZ05hbWUgPSBlbGVtZW50LmltZ1NyYy5zcGxpdChcIi9cIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoaW1nRWxlbWVudC5zcmMuc3BsaXQoXCIvXCIpLmZpbmQoZWxlbSA9PiBlbGVtID09IGltZ05hbWVbaW1nTmFtZS5sZW5ndGggLSAxXSkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGV4c2lzdCA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vbm9uZSBleHNpc3RpbmcgRE9NSW1nIGZvciBJdGVtXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFleHNpc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpdjogSFRNTERpdkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXYuY2xhc3NOYW1lID0gXCJ0b29sdGlwXCI7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SXRlbTogSFRNTEltYWdlRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJpbWdcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0l0ZW0uc3JjID0gZWxlbWVudC5pbWdTcmM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld0Rpdi5hcHBlbmRDaGlsZChuZXdJdGVtKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdUb29sdGlwOiBIVE1MU3BhbkVsZW1lbnQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwic3BhblwiKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VG9vbHRpcC50ZXh0Q29udGVudCA9IGVsZW1lbnQuZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rvb2x0aXAuY2xhc3NOYW1lID0gXCJ0b29sdGlwdGV4dFwiO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdEaXYuYXBwZW5kQ2hpbGQobmV3VG9vbHRpcCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3VG9vbHRpcExhYmVsOiBIVE1MUGFyYWdyYXBoRWxlbWVudCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJwXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdUb29sdGlwTGFiZWwudGV4dENvbnRlbnQgPSBlbGVtZW50Lm5hbWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Rvb2x0aXAuaW5zZXJ0QWRqYWNlbnRFbGVtZW50KFwiYWZ0ZXJiZWdpblwiLCBuZXdUb29sdGlwTGFiZWwpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX3VpLnF1ZXJ5U2VsZWN0b3IoXCIjSW52ZW50b3J5XCIpLmFwcGVuZENoaWxkKG5ld0Rpdik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRaZXJvOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dE9uZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3c6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0VGhyZWU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0Rm91cjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRGaXZlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNpeDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTZXZlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRFaWdodDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHROaW5lOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFRlbjogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYW1hZ2VVSSBleHRlbmRzIMaSLk5vZGUge1xyXG4gICAgICAgIHB1YmxpYyB0YWc6IFRhZy5UQUcgPSBUYWcuVEFHLlVJO1xyXG4gICAgICAgIHVwOiBudW1iZXIgPSAwLjE1O1xyXG4gICAgICAgIGxpZmV0aW1lOiBudW1iZXIgPSAwLjUgKiA2MDtcclxuICAgICAgICByYW5kb21YOiBudW1iZXIgPSBNYXRoLnJhbmRvbSgpICogMC4wNSAtIE1hdGgucmFuZG9tKCkgKiAwLjA1O1xyXG4gICAgICAgIGFzeW5jIGxpZmVzcGFuKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA+PSAwICYmIHRoaXMubGlmZXRpbWUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5saWZldGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMubGlmZXRpbWUgPCAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IzLCBfZGFtYWdlOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJkYW1hZ2VVSVwiKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoMC4zMywgMC4zMywgMC4zMykpO1xyXG4gICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9wb3NpdGlvbi54LCBfcG9zaXRpb24ueSwgMC4yNSk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQoKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1lc2g6IMaSLkNvbXBvbmVudE1lc2ggPSBuZXcgxpIuQ29tcG9uZW50TWVzaChtZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQoY21wTWVzaCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgbXRyU29saWRXaGl0ZTogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJTb2xpZFdoaXRlXCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobXRyU29saWRXaGl0ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUoX2RhbWFnZSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy51cGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy5tb3ZlKCk7XHJcbiAgICAgICAgICAgIHRoaXMubGlmZXNwYW4oKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFzeW5jIG1vdmUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShuZXcgxpIuVmVjdG9yMyh0aGlzLnJhbmRvbVgsIHRoaXMudXAsIDApKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwuc2NhbGUoxpIuVmVjdG9yMy5PTkUoMS4wMSkpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZFRleHR1cmUoX2RhbWFnZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbGV0IG5ld0NvYXQ6IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCA9IG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoKTtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuICAgICAgICAgICAgbGV0IG9sZENvbUNvYXQ6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKCk7XHJcblxyXG4gICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgc3dpdGNoIChNYXRoLmFicyhfZGFtYWdlKSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFplcm87XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0T25lO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSAyOlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dFRvdztcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRUaHJlZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgICAgICAgICBuZXdUeHQgPSB0eHRGb3VyO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSA1OlxyXG4gICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHR4dEZpdmU7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDY6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0U2V2ZW47XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDc6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDg6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0RWlnaHQ7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDk6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0TmluZTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMTA6XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gdHh0VGVuO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RhbWFnZSA+PSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdDb2F0LmNvbG9yID0gxpIuQ29sb3IuQ1NTKFwicmVkXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy51cCA9IDAuMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBuZXdDb2F0LnRleHR1cmUgPSBuZXdUeHQ7XHJcbiAgICAgICAgICAgIG9sZENvbUNvYXQubWF0ZXJpYWwgPSBuZXdNdHI7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgaGVhbFBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHBvaXNvblBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGJ1cm5QYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBibGVlZGluZ1BhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHNsb3dQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBpbW11bmVQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgY29tbW9uUGFydGljbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgcmFyZVBhcnRpY2xlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IGVwaWNQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCBsZWdlbmRhcnlQYXJ0aWNsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBQYXJ0aWNsZXMgZXh0ZW5kcyBHYW1lLsaSQWlkLk5vZGVTcHJpdGUge1xyXG4gICAgICAgIGlkOiBCdWZmLkJVRkZJRCB8IEl0ZW1zLlJBUklUWTtcclxuICAgICAgICBhbmltYXRpb25QYXJ0aWNsZXM6IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb247XHJcbiAgICAgICAgcGFydGljbGVmcmFtZU51bWJlcjogbnVtYmVyO1xyXG4gICAgICAgIHBhcnRpY2xlZnJhbWVSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgd2lkdGg6IG51bWJlcjtcclxuICAgICAgICBoZWlnaHQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJ1ZmYuQlVGRklEIHwgSXRlbXMuUkFSSVRZLCBfdGV4dHVyZTogR2FtZS7Gki5UZXh0dXJlSW1hZ2UsIF9mcmFtZUNvdW50OiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCdWZmLkJVRkZJRFtfaWRdLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmlkID0gX2lkO1xyXG4gICAgICAgICAgICB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXIgPSBfZnJhbWVDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5wYXJ0aWNsZWZyYW1lUmF0ZSA9IF9mcmFtZVJhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uUGFydGljbGVzID0gbmV3IEdhbWUuxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24oQnVmZi5CVUZGSURbX2lkXS50b0xvd2VyQ2FzZSgpLCBuZXcgxpIuQ29hdFRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpLCBfdGV4dHVyZSkpXHJcbiAgICAgICAgICAgIHRoaXMuaGVpZ2h0ID0gX3RleHR1cmUuaW1hZ2UuaGVpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLndpZHRoID0gX3RleHR1cmUuaW1hZ2Uud2lkdGggLyB0aGlzLnBhcnRpY2xlZnJhbWVOdW1iZXI7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvblBhcnRpY2xlcy5nZW5lcmF0ZUJ5R3JpZCjGki5SZWN0YW5nbGUuR0VUKDAsIDAsIHRoaXMud2lkdGgsIHRoaXMuaGVpZ2h0KSwgdGhpcy5wYXJ0aWNsZWZyYW1lTnVtYmVyLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgodGhpcy53aWR0aCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbih0aGlzLmFuaW1hdGlvblBhcnRpY2xlcyk7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVyYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMDEpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgVGFnIHtcclxuICAgIGV4cG9ydCBlbnVtIFRBRyB7XHJcbiAgICAgICAgUExBWUVSLFxyXG4gICAgICAgIEVORU1ZLFxyXG4gICAgICAgIEJVTExFVCxcclxuICAgICAgICBJVEVNLFxyXG4gICAgICAgIFJPT00sXHJcbiAgICAgICAgV0FMTCxcclxuICAgICAgICBET09SLFxyXG4gICAgICAgIE9CU1RJQ0FMLFxyXG4gICAgICAgIFVJXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW50aXR5IGV4dGVuZHMgR2FtZS7GkkFpZC5Ob2RlU3ByaXRlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHByb3RlY3RlZCBjdXJyZW50QW5pbWF0aW9uU3RhdGU6IEFOSU1BVElPTlNUQVRFUztcclxuICAgICAgICBwcml2YXRlIHBlcmZvcm1Lbm9ja2JhY2s6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBuZXRPYmplY3ROb2RlOiDGki5Ob2RlID0gdGhpcztcclxuICAgICAgICBwdWJsaWMgaWQ6IEVudGl0eS5JRDtcclxuICAgICAgICBwdWJsaWMgYXR0cmlidXRlczogQXR0cmlidXRlcztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBpdGVtczogQXJyYXk8SXRlbXMuSXRlbT4gPSBbXTtcclxuICAgICAgICBwdWJsaWMgd2VhcG9uOiBXZWFwb25zLldlYXBvbjtcclxuICAgICAgICBwdWJsaWMgYnVmZnM6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgcHVibGljIG9mZnNldENvbGxpZGVyWDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRDb2xsaWRlclk6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXJTY2FsZUZha3RvcjogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBjYW5Nb3ZlWDogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgcHJvdGVjdGVkIGNhbk1vdmVZOiBib29sZWFuID0gdHJ1ZTtcclxuICAgICAgICBwcm90ZWN0ZWQgbW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBwcm90ZWN0ZWQgYW5pbWF0aW9uQ29udGFpbmVyOiBBbmltYXRpb25HZW5lcmF0aW9uLkFuaW1hdGlvbkNvbnRhaW5lcjtcclxuICAgICAgICBwcm90ZWN0ZWQgaWRsZVNjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRLbm9ja2JhY2s6IMaSLlZlY3RvcjMgPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICBwdWJsaWMgc2hhZG93OiBTaGFkb3c7XHJcblxyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKGdldE5hbWVCeUlkKF9pZCkpO1xyXG4gICAgICAgICAgICB0aGlzLm5ldElkID0gTmV0d29ya2luZy5JZE1hbmFnZXIoX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gbmV3IEF0dHJpYnV0ZXMoMSwgMSwgMSwgMSwgMSwgMSwgMSwgMSk7XHJcbiAgICAgICAgICAgIGlmIChBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGFuaSA9IEFuaW1hdGlvbkdlbmVyYXRpb24uZ2V0QW5pbWF0aW9uQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uQ29udGFpbmVyID0gYW5pO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pZGxlU2NhbGUgPSBhbmkuc2NhbGUuZmluZChhbmltYXRpb24gPT4gYW5pbWF0aW9uWzBdID09IFwiaWRsZVwiKVsxXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWCA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXJZID0gMDtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yID0gMTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyAodGhpcy5vZmZzZXRDb2xsaWRlclggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArICh0aGlzLm9mZnNldENvbGxpZGVyWSAqIHRoaXMubXR4TG9jYWwuc2NhbGluZy55KSksICh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3RvciwgdGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICBpZiAoQW5pbWF0aW9uR2VuZXJhdGlvbi5nZXRBbmltYXRpb25CeUlkKHRoaXMuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIGxldCBhbmkgPSBBbmltYXRpb25HZW5lcmF0aW9uLmdldEFuaW1hdGlvbkJ5SWQodGhpcy5pZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lciA9IGFuaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuaWRsZVNjYWxlID0gYW5pLnNjYWxlLmZpbmQoYW5pbWF0aW9uID0+IGFuaW1hdGlvblswXSA9PSBcImlkbGVcIilbMV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5zaGFkb3cgPSBuZXcgU2hhZG93KHRoaXMpO1xyXG4gICAgICAgICAgICAvLyB0aGlzLmFkZENoaWxkKHRoaXMuc2hhZG93KTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlQnVmZnMoKTtcclxuICAgICAgICAgICAgdGhpcy5zaGFkb3cudXBkYXRlU2hhZG93UG9zKCk7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZVNjYWxlKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMudXBkYXRlU2NhbGVEZXBlbmRlbmNpZXMoKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IMaSLlZlY3RvcjModGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUsIHRoaXMuYXR0cmlidXRlcy5zY2FsZSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UmFkaXVzKCh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyKSAqIHRoaXMuY29sbGlkZXJTY2FsZUZha3Rvcik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q29sbGlkZXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIuc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHRoaXMub2Zmc2V0Q29sbGlkZXJYICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLngpLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAodGhpcy5vZmZzZXRDb2xsaWRlclkgKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueSkpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVCdWZmcygpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuYnVmZnMubGVuZ3RoID09IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMuYnVmZnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVmZnNbaV0uZG9CdWZmU3R1ZmYodGhpcyk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSB0cnVlO1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gR2FtZS5jdXJyZW50Um9vbS53YWxscztcclxuICAgICAgICAgICAgbGV0IHdhbGxDb2xsaWRlcnM6IEdhbWUuxpIuUmVjdGFuZ2xlW10gPSBbXTtcclxuICAgICAgICAgICAgd2FsbHMuZm9yRWFjaChlbGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHdhbGxDb2xsaWRlcnMucHVzaChlbGVtLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgbGV0IG1ld0RpcmVjdGlvbiA9IF9kaXJlY3Rpb24uY2xvbmU7XHJcbiAgICAgICAgICAgIGlmICghbWV3RGlyZWN0aW9uLmVxdWFscyhHYW1lLsaSLlZlY3RvcjMuWkVSTygpKSkge1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgbWV3RGlyZWN0aW9uLnNjYWxlKChHYW1lLmRlbHRhVGltZSAqIHRoaXMuYXR0cmlidXRlcy5zcGVlZCkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlQ29sbGlzaW9uKHdhbGxDb2xsaWRlcnMsIG1ld0RpcmVjdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY2FsY3VsYXRlQ29sbGlzaW9uKF9jb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXJbXSB8IEdhbWUuxpIuUmVjdGFuZ2xlW10sIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2NvbGxpZGVyLmZvckVhY2goKGVsZW1lbnQpID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgQ29sbGlkZXIuQ29sbGlkZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlcyhlbGVtZW50KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgaW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb24oZWxlbWVudCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZSA9IGludGVyc2VjdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMuY29sbGlkZXIuZ2V0UmFkaXVzICsgZWxlbWVudC5nZXRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVggPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3RGlyZWN0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMigwLCBfZGlyZWN0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbi50cmFuc2Zvcm0oxpIuTWF0cml4M3gzLlRSQU5TTEFUSU9OKG5ld0RpcmVjdGlvbikpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmdldEludGVyc2VjdGlvbihlbGVtZW50KSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0ludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uKGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoYXJlYUJlZm9yZU1vdmUgPCBhcmVhQWZ0ZXJNb3ZlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY2FuTW92ZVkgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gb2xkUG9zaXRpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZWxlbWVudC5vd25lck5ldElkID09IEdhbWUuYXZhdGFyMS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50Lm93bmVyTmV0SWQgPT0gR2FtZS5hdmF0YXIyLm5ldElkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5rbm9ja2JhY2tQdXNoKHRoaXMuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIGlmIChlbGVtZW50IGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3QoZWxlbWVudCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbiA9IHRoaXMuY29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdChlbGVtZW50KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFyZWFCZWZvcmVNb3ZlID0gaW50ZXJzZWN0aW9uLmhlaWdodCAqIGludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8IHRoaXMubXR4TG9jYWwuc2NhbGluZy54ICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvbGRQb3NpdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIodGhpcy5jb2xsaWRlci5wb3NpdGlvbi54LCB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uLnkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoX2RpcmVjdGlvbi54LCAwKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVYID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24gPSBvbGRQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0RpcmVjdGlvbiA9IG5ldyBHYW1lLsaSLlZlY3RvcjIoMCwgX2RpcmVjdGlvbi55KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIucG9zaXRpb24udHJhbnNmb3JtKMaSLk1hdHJpeDN4My5UUkFOU0xBVElPTihuZXdEaXJlY3Rpb24pKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3SW50ZXJzZWN0aW9uID0gdGhpcy5jb2xsaWRlci5nZXRJbnRlcnNlY3Rpb25SZWN0KGVsZW1lbnQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQWZ0ZXJNb3ZlID0gbmV3SW50ZXJzZWN0aW9uLmhlaWdodCAqIG5ld0ludGVyc2VjdGlvbi53aWR0aDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGFyZWFCZWZvcmVNb3ZlIDwgYXJlYUFmdGVyTW92ZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNhbk1vdmVZID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb2xsaWRlci5wb3NpdGlvbiA9IG9sZFBvc2l0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWCA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jYW5Nb3ZlWSA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogZG9lcyBEYW1hZ2UgdG8gdGhlIEVudGl0eVxyXG4gICAgICAgICAqIEBwYXJhbSBfdmFsdWUgdmFsdWUgaG93IG11Y2ggZGFtYWdlIGlzIGFwcGxpZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChfdmFsdWUgIT0gbnVsbCAmJiB0aGlzLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBoaXRWYWx1ZSA9IHRoaXMuZ2V0RGFtYWdlUmVkdWN0aW9uKF92YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyAtPSBoaXRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCBNYXRoLnJvdW5kKGhpdFZhbHVlKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlVUkodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgTWF0aC5yb3VuZChoaXRWYWx1ZSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIHR5cGU6IEFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTIH0sIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlRW50aXR5KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGllKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkaWUoKSB7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldERhbWFnZVJlZHVjdGlvbihfdmFsdWU6IG51bWJlcik6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiBfdmFsdWUgKiAoMSAtICh0aGlzLmF0dHJpYnV0ZXMuYXJtb3IgLyAxMDApKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jcmVnaW9uIGtub2NrYmFja1xyXG4gICAgICAgIHB1YmxpYyBkb0tub2NrYmFjayhfYm9keTogRW50aXR5LkVudGl0eSkge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5wZXJmb3JtS25vY2tiYWNrKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnBlcmZvcm1Lbm9ja2JhY2sgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9wb3NpdGlvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKDApO1xyXG4gICAgICAgICAgICAgICAgbGV0IGtub2NrQmFja1NjYWxpbmc6IG51bWJlciA9IEdhbWUuZGVsdGFUaW1lICogdGhpcy5hdHRyaWJ1dGVzLnNjYWxlO1xyXG5cclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24uc2NhbGUoX2tub2NrYmFja0ZvcmNlICoga25vY2tCYWNrU2NhbGluZyk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50S25vY2tiYWNrLmFkZChkaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcmVkdWNlS25vY2tiYWNrKCkge1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRLbm9ja2JhY2suc2NhbGUoMC41KTtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2codGhpcy5jdXJyZW50S25vY2tiYWNrLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRLbm9ja2JhY2subWFnbml0dWRlIDwgMC4wMDAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRLbm9ja2JhY2sgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5wZXJmb3JtS25vY2tiYWNrID0gZmFsc2U7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgICAgIHB1YmxpYyBzd2l0Y2hBbmltYXRpb24oX25hbWU6IEFOSU1BVElPTlNUQVRFUykge1xyXG4gICAgICAgICAgICBsZXQgbmFtZTogc3RyaW5nID0gQU5JTUFUSU9OU1RBVEVTW19uYW1lXS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5hbmltYXRpb25Db250YWluZXIgIT0gbnVsbCAmJiA8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgIT0gX25hbWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKF9uYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLklETEU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5JRExFO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLldBTEs6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5XQUxLO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLlNVTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QW5pbWF0aW9uKDzGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbj50aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5hbmltYXRpb25zW25hbWVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEFuaW1hdGlvblN0YXRlID0gQU5JTUFUSU9OU1RBVEVTLlNVTU1PTjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEFOSU1BVElPTlNUQVRFUy5BVFRBQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25Db250YWluZXIuYW5pbWF0aW9uc1tuYW1lXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSA9IEFOSU1BVElPTlNUQVRFUy5BVFRBQ0s7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQU5JTUFUSU9OU1RBVEVTLlRFTEVQT1JUOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbbmFtZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QW5pbWF0aW9uU3RhdGUgPSBBTklNQVRJT05TVEFURVMuVEVMRVBPUlQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5mcmFtZXJhdGUgPSB0aGlzLmFuaW1hdGlvbkNvbnRhaW5lci5mcmFtZVJhdGUuZmluZChvYmogPT4gb2JqWzBdID09IG5hbWUpWzFdO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0RnJhbWVEaXJlY3Rpb24oMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBbmltYXRpb25TdGF0ZSh0aGlzLmN1cnJlbnRBbmltYXRpb25TdGF0ZSwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLndhcm4oXCJubyBhbmltYXRpb25Db250YWluZXIgb3IgYW5pbWF0aW9uIHdpdGggbmFtZTogXCIgKyBuYW1lICsgXCIgYXQgRW50aXR5OiBcIiArIHRoaXMubmFtZSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuICAgIGV4cG9ydCBlbnVtIEFOSU1BVElPTlNUQVRFUyB7XHJcbiAgICAgICAgSURMRSwgV0FMSywgU1VNTU9OLCBBVFRBQ0ssIFRFTEVQT1JUXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQkVIQVZJT1VSIHtcclxuICAgICAgICBJRExFLCBGT0xMT1csIEZMRUUsIFNVTU1PTiwgQVRUQUNLXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gSUQge1xyXG4gICAgICAgIFJBTkdFRCxcclxuICAgICAgICBNRUxFRSxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBCQVQsXHJcbiAgICAgICAgUkVEVElDSyxcclxuICAgICAgICBTTUFMTFRJQ0ssXHJcbiAgICAgICAgU0tFTEVUT04sXHJcbiAgICAgICAgT0dFUixcclxuICAgICAgICBTVU1NT05PUlxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROYW1lQnlJZChfaWQ6IEVudGl0eS5JRCk6IHN0cmluZyB7XHJcbiAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgY2FzZSBJRC5SQU5HRUQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJyYW5nZWRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5NRUxFRTpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInRhbmtcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gXCJiYXRcIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwicmVkVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBcInNtYWxsVGlja1wiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic2tlbGV0b25cIjtcclxuICAgICAgICAgICAgY2FzZSBJRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwib2dlclwiO1xyXG4gICAgICAgICAgICBjYXNlIElELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFwic3VtbW9ub3JcIjtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW5lbXkge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEVORU1ZQ0xBU1Mge1xyXG4gICAgICAgIEVORU1ZRFVNQixcclxuICAgICAgICBFTkVNWURBU0gsXHJcbiAgICAgICAgRU5FTVlTTUFTSCxcclxuICAgICAgICBFTkVNWVBBVFJPTCxcclxuICAgICAgICBFTkVNWVNIT09ULFxyXG4gICAgICAgIFNVTU1PTk9SLFxyXG4gICAgICAgIFNVTU1PTk9SQUREU1xyXG4gICAgfVxyXG5cclxuICAgIGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteSBleHRlbmRzIEVudGl0eS5FbnRpdHkgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklLbm9ja2JhY2thYmxlIHtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSO1xyXG4gICAgICAgIHRhcmdldDogxpIuVmVjdG9yMjtcclxuICAgICAgICBtb3ZlRGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgIGZsb2NraW5nOiBGbG9ja2luZ0JlaGF2aW91cjtcclxuICAgICAgICBpc0FnZ3Jlc3NpdmU6IGJvb2xlYW47XHJcblxyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuRU5FTVk7XHJcbiAgICAgICAgICAgIHRoaXMuaXNBZ2dyZXNzaXZlID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGxldCByZWYgPSBHYW1lLmVuZW1pZXNKU09OLmZpbmQoZW5lbXkgPT4gZW5lbXkubmFtZSA9PSBFbnRpdHkuSURbX2lkXS50b0xvd2VyQ2FzZSgpKVxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyZWYpO1xyXG4gICAgICAgICAgICB0aGlzLmF0dHJpYnV0ZXMgPSBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgcmVmLmF0dHJpYnV0ZXMua25vY2tiYWNrRm9yY2UsIHJlZi5hdHRyaWJ1dGVzLmFybW9yLCByZWYuYXR0cmlidXRlcy5jb29sRG93blJlZHVjdGlvbiwgcmVmLmF0dHJpYnV0ZXMuYWNjdXJhY3kpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5zZXRBbmltYXRpb24oPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbXCJpZGxlXCJdKTtcclxuICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhfcG9zaXRpb24ueCwgX3Bvc2l0aW9uLnksIDAuMSk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyDGki5WZWN0b3IzKHRoaXMuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLmF0dHJpYnV0ZXMuc2NhbGUpO1xyXG4gICAgICAgICAgICB0aGlzLm9mZnNldENvbGxpZGVyWCA9IHJlZi5vZmZzZXRDb2xsaWRlclg7XHJcbiAgICAgICAgICAgIHRoaXMub2Zmc2V0Q29sbGlkZXJZID0gcmVmLm9mZnNldENvbGxpZGVyWTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yID0gcmVmLmNvbGxpZGVyU2NhbGVGYWt0b3I7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIobmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKHJlZi5vZmZzZXRDb2xsaWRlclggKiB0aGlzLm10eExvY2FsLnNjYWxpbmcueCksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArIChyZWYub2Zmc2V0Q29sbGlkZXJZICogdGhpcy5tdHhMb2NhbC5zY2FsaW5nLnkpKSwgKCh0aGlzLm10eExvY2FsLnNjYWxpbmcueCAqIHRoaXMuaWRsZVNjYWxlKSAvIDIpICogdGhpcy5jb2xsaWRlclNjYWxlRmFrdG9yLCB0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlQmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm1vdmUodGhpcy5tb3ZlRGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW5lbXlQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0RGFtYWdlKF92YWx1ZTogbnVtYmVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmdldERhbWFnZShfdmFsdWUpO1xyXG4gICAgICAgICAgICB0aGlzLmlzQWdncmVzc2l2ZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gKDxQbGF5ZXIuUGxheWVyPl9ib2R5KS5nZXRLbm9ja2JhY2sodGhpcy5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0S25vY2tiYWNrKF9rbm9ja2JhY2tGb3JjZTogbnVtYmVyLCBfcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgLy8gdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBZ2dyZXNzaXZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIHRoaXMubW92ZURpcmVjdGlvbi5zdWJ0cmFjdChfZGlyZWN0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZVNpbXBsZShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgcmV0dXJuIGRpcmVjdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlQXdheShfdGFyZ2V0OiDGki5WZWN0b3IyKTogxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGxldCBtb3ZlU2ltcGxlID0gdGhpcy5tb3ZlU2ltcGxlKF90YXJnZXQpO1xyXG4gICAgICAgICAgICBtb3ZlU2ltcGxlLnggKj0gLTE7XHJcbiAgICAgICAgICAgIG1vdmVTaW1wbGUueSAqPSAtMTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmVTaW1wbGU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGllKCkge1xyXG4gICAgICAgICAgICBzdXBlci5kaWUoKTtcclxuICAgICAgICAgICAgR2FtZS5jdXJyZW50Um9vbS5lbmVteUNvdW50TWFuYWdlci5vbkVuZW15RGVhdGgoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgbGV0IGtub2NrYmFjayA9IHRoaXMuY3VycmVudEtub2NrYmFjay5jbG9uZTtcclxuICAgICAgICAgICAgaWYgKGtub2NrYmFjay5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5hZGQoa25vY2tiYWNrKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgICAgIGtub2NrYmFjay5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuXHJcblxyXG4gICAgICAgICAgICAgICAgc3VwZXIuY29sbGlkZShfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgYXZhdGFyOiBQbGF5ZXIuUGxheWVyW10gPSAoPFBsYXllci5QbGF5ZXJbXT5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2YXRhckNvbGxpZGVyczogQ29sbGlkZXIuQ29sbGlkZXJbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgYXZhdGFyLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBhdmF0YXJDb2xsaWRlcnMucHVzaCgoPFBsYXllci5QbGF5ZXI+ZWxlbSkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVDb2xsaXNpb24oYXZhdGFyQ29sbGlkZXJzLCBfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmICh0aGlzLmNhbk1vdmVYICYmICF0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX2RpcmVjdGlvbiA9IG5ldyDGki5WZWN0b3IzKF9kaXJlY3Rpb24ueCwgMCwgX2RpcmVjdGlvbi56KVxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoIXRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMygwLCBfZGlyZWN0aW9uLnksIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uLnN1YnRyYWN0KGtub2NrYmFjayk7XHJcbiAgICAgICAgICAgICAgICBpZiAoa25vY2tiYWNrLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImtub2NrYmFjazogXCIgKyBrbm9ja2JhY2subWFnbml0dWRlKTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBjb25zb2xlLmxvZyhcImRpcmVjdGlvbjogXCIgKyBfZGlyZWN0aW9uLm1hZ25pdHVkZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMucmVkdWNlS25vY2tiYWNrKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlEdW1iIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIHB1YmxpYyBmbG9ja2luZzogRmxvY2tpbmdCZWhhdmlvdXIgPSBuZXcgRmxvY2tpbmdCZWhhdmlvdXIodGhpcywgMiwgMiwgMC4xLCAxLCAxLCAxLCAwLCAxKTtcclxuICAgICAgICBwcml2YXRlIGFnZ3Jlc3NpdmVEaXN0YW5jZTogbnVtYmVyID0gMyAqIDM7XHJcbiAgICAgICAgcHJpdmF0ZSBzdGFtaW5hOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oMTgwKTtcclxuICAgICAgICBwcml2YXRlIHJlY292ZXI6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big2MCk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zOiBHYW1lLsaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3BvcywgX25ldElkKTtcclxuICAgICAgICAgICAgLy9UT0RPOiB0YWxrIHdpdGggdG9iaVxyXG4gICAgICAgICAgICB0aGlzLnN0YW1pbmEub25FbmRDb29sRG93biA9ICgpID0+IHRoaXMucmVjb3ZlclN0YW07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLnRhcmdldC50b1ZlY3RvcjMoKSwgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pLm1hZ25pdHVkZVNxdWFyZWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZmxvY2tpbmcudXBkYXRlKCk7XHJcbiAgICAgICAgICAgIC8vVE9ETzogc2V0IHRvIDMgYWZ0ZXIgdGVzdGluZ1xyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPCB0aGlzLmFnZ3Jlc3NpdmVEaXN0YW5jZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmlzQWdncmVzc2l2ZSAmJiAhdGhpcy5yZWNvdmVyLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSByZWNvdmVyU3RhbSA9ICgpID0+IHtcclxuICAgICAgICAgICAgdGhpcy5yZWNvdmVyLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuV0FMSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF0aGlzLnN0YW1pbmEuaGFzQ29vbERvd24gJiYgIXRoaXMucmVjb3Zlci5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YW1pbmEuc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5zdGFtaW5hLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHNldCBhIGNhbGxiYWNrIGZ1bmN0aW9uIHRvIGRvIHRoaXMuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIGlmICh0aGlzLnN0YW1pbmEuZ2V0Q3VycmVudENvb2xkb3duID09IDEpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gICAgIHRoaXMucmVjb3Zlci5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteVNtYXNoIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgICAgIGNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNSk7XHJcbiAgICAgICAgYXZhdGFyczogUGxheWVyLlBsYXllcltdID0gW107XHJcbiAgICAgICAgcmFuZG9tUGxheWVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKTtcclxuICAgICAgICBjdXJyZW50QmVoYXZpb3VyOiBFbnRpdHkuQkVIQVZJT1VSID0gRW50aXR5LkJFSEFWSU9VUi5JRExFO1xyXG5cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhcnMgPSBbR2FtZS5hdmF0YXIxLCBHYW1lLmF2YXRhcjJdO1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9ICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcnNbdGhpcy5yYW5kb21QbGF5ZXJdKS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEJlaGF2aW91ciA9PSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSyAmJiB0aGlzLmdldEN1cnJlbnRGcmFtZSA+PSAoPMaSQWlkLlNwcml0ZVNoZWV0QW5pbWF0aW9uPnRoaXMuYW5pbWF0aW9uQ29udGFpbmVyLmFuaW1hdGlvbnNbXCJhdHRhY2tcIl0pLmZyYW1lcy5sZW5ndGggLSAxKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNCAmJiAhdGhpcy5jb29sRG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jb29sRG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5jb29sRG93bi5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgIT0gRW50aXR5LkJFSEFWSU9VUi5JRExFKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEJlaGF2aW91ciAhPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmN1cnJlbnRCZWhhdmlvdXIpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVTaW1wbGUodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkFUVEFDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLkFUVEFDSyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteURhc2ggZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcHJvdGVjdGVkIGRhc2ggPSBuZXcgQWJpbGl0eS5EYXNoKHRoaXMubmV0SWQsIDEyLCAxLCA1ICogNjAsIDMpO1xyXG4gICAgICAgIGxhc3RNb3ZlRGlyZWNpdG9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICAgICAgZGFzaENvdW50OiBudW1iZXIgPSAxO1xyXG4gICAgICAgIGF2YXRhcnM6IFBsYXllci5QbGF5ZXJbXSA9IFtdO1xyXG4gICAgICAgIHJhbmRvbVBsYXllciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSk7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZyA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAzLCAwLjgsIDEuNSwgMSwgMSwgMC4xLCAwKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuXHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXVxyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9ICg8UGxheWVyLlBsYXllcj50aGlzLmF2YXRhcnNbdGhpcy5yYW5kb21QbGF5ZXJdKS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlU3F1YXJlZDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZy51cGRhdGUoKTtcclxuXHJcbiAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmhhc0Nvb2xkb3duKCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudEJlaGF2aW91ciA9IEVudGl0eS5CRUhBVklPVVIuRk9MTE9XO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChNYXRoLnJhbmRvbSgpICogMTAwIDwgMC4xKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcblxyXG4gICAgICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubW92ZURpcmVjdGlvbi5tYWduaXR1ZGVTcXVhcmVkID4gMC4wMDA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5JRExFKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRk9MTE9XOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmxhc3RNb3ZlRGlyZWNpdG9uID0gdGhpcy5tb3ZlRGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IMaSLlZlY3RvcjMuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KHRoaXMudGFyZ2V0KS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRW5lbXlQYXRyb2wgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgcGF0cm9sUG9pbnRzOiDGki5WZWN0b3IyW10gPSBbbmV3IMaSLlZlY3RvcjIoMCwgNCksIG5ldyDGki5WZWN0b3IyKDUsIDApXTtcclxuICAgICAgICB3YWl0VGltZTogbnVtYmVyID0gMTAwMDtcclxuICAgICAgICBjdXJyZW5Qb2ludEluZGV4OiBudW1iZXIgPSAwO1xyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLnBhdHJvbCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcGF0cm9sKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSjGki5WZWN0b3IzLlNVTSh0aGlzLnBhdHJvbFBvaW50c1t0aGlzLmN1cnJlblBvaW50SW5kZXhdLnRvVmVjdG9yMygpLCBHYW1lLmN1cnJlbnRSb29tLm10eExvY2FsLnRyYW5zbGF0aW9uKSkgPiAwLjMpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSgoxpIuVmVjdG9yMi5TVU0odGhpcy5wYXRyb2xQb2ludHNbdGhpcy5jdXJyZW5Qb2ludEluZGV4XSwgR2FtZS5jdXJyZW50Um9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlblBvaW50SW5kZXggKyAxIDwgdGhpcy5wYXRyb2xQb2ludHMubGVuZ3RoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVuUG9pbnRJbmRleCsrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW5Qb2ludEluZGV4ID0gMDtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9LCB0aGlzLndhaXRUaW1lKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEVuZW15U2hvb3QgZXh0ZW5kcyBFbmVteSB7XHJcbiAgICAgICAgdmlld1JhZGl1czogbnVtYmVyID0gMztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy53ZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oNjAsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMiwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGJlaGF2aW91cigpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy50YXJnZXQgPSBDYWxjdWxhdGlvbi5nZXRDbG9zZXJBdmF0YXJQb3NpdGlvbih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG5cclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GTEVFO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKGRpc3RhbmNlIDwgOSAmJiB0aGlzLmlzQWdncmVzc2l2ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5GT0xMT1c7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLklETEU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIG1vdmVCZWhhdmlvdXIoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYmVoYXZpb3VyKCk7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZVNpbXBsZSh0aGlzLnRhcmdldCkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2hvb3QoX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIGxldCBfZGlyZWN0aW9uID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKHRoaXMudGFyZ2V0LnRvVmVjdG9yMygwKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcblxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5tYWduaXR1ZGUgPCAzIHx8IHRoaXMuaXNBZ2dyZXNzaXZlKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLndlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBfZGlyZWN0aW9uLCBfbmV0SWQsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTdW1tb25vckFkZHMgZXh0ZW5kcyBFbmVteURhc2gge1xyXG4gICAgICAgIGF2YXRhcjogUGxheWVyLlBsYXllcjtcclxuICAgICAgICByYW5kb21QbGF5ZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0OiBQbGF5ZXIuUGxheWVyLCBfbmV0SWQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2lkLCBfcG9zaXRpb24sIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyID0gX3RhcmdldDtcclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZyA9IG5ldyBGbG9ja2luZ0JlaGF2aW91cih0aGlzLCAzLCAwLjgsIDEuNSwgMSwgMSwgMC4xLCAwKTtcclxuXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcbiAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gdGhpcy5hdmF0YXIubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICBpZiAoZGlzdGFuY2UgPiA1KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSBpZiAoZGlzdGFuY2UgPCAzKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5mbG9ja2luZy51cGRhdGUoKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBtb3ZlQmVoYXZpb3VyKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmJlaGF2aW91cigpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY3VycmVudEJlaGF2aW91cikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZPTExPVzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICghdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY2l0b24gPSB0aGlzLm1vdmVEaXJlY3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMuZmxvY2tpbmcuZ2V0TW92ZVZlY3RvcigpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5JRExFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gxpIuVmVjdG9yMy5aRVJPKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuRkxFRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubW92ZURpcmVjdGlvbiA9IHRoaXMubW92ZUF3YXkodGhpcy50YXJnZXQpLnRvVmVjdG9yMygpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcblxyXG4gICAgLy8gZXhwb3J0IGNsYXNzIEVuZW15Q2lyY2xlIGV4dGVuZHMgRW5lbXkge1xyXG4gICAgLy8gICAgIGRpc3RhbmNlOiBudW1iZXIgPSA1O1xyXG5cclxuICAgIC8vICAgICBjb25zdHJ1Y3RvcihfbmFtZTogc3RyaW5nLCBfcHJvcGVydGllczogUGxheWVyLkNoYXJhY3RlciwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyKF9uYW1lLCBfcHJvcGVydGllcywgX3Bvc2l0aW9uKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIG1vdmUoKTogdm9pZCB7XHJcbiAgICAvLyAgICAgICAgIHN1cGVyLm1vdmUoKTtcclxuICAgIC8vICAgICAgICAgdGhpcy5tb3ZlQ2lyY2xlKCk7XHJcbiAgICAvLyAgICAgfVxyXG5cclxuICAgIC8vICAgICBsaWZlc3BhbihfZ3JhcGg6IMaSLk5vZGUpOiB2b2lkIHtcclxuICAgIC8vICAgICAgICAgc3VwZXIubGlmZXNwYW4oX2dyYXBoKTtcclxuICAgIC8vICAgICB9XHJcblxyXG4gICAgLy8gICAgIGFzeW5jIG1vdmVDaXJjbGUoKSB7XHJcbiAgICAvLyAgICAgICAgIHRoaXMudGFyZ2V0ID0gQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBjb25zb2xlLmxvZyh0aGlzLnRhcmdldCk7XHJcbiAgICAvLyAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjEgPSB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjEuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgIC8vICAgICAgICAgLy8gbGV0IGRpc3RhbmNlUGxheWVyMiA9IHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKEdhbWUucGxheWVyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgLy8gICAgICAgICBpZiAoZGlzdGFuY2VQbGF5ZXIxID4gdGhpcy5kaXN0YW5jZSkge1xyXG4gICAgLy8gICAgICAgICAgICAgdGhpcy5tb3ZlU2ltcGxlKCk7XHJcbiAgICAvLyAgICAgICAgIH1cclxuICAgIC8vICAgICAgICAgZWxzZSB7XHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgZGVncmVlID0gQ2FsY3VsYXRpb24uY2FsY0RlZ3JlZSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgdGhpcy50YXJnZXQpXHJcbiAgICAvLyAgICAgICAgICAgICBsZXQgYWRkID0gMDtcclxuXHJcbiAgICAvLyAgICAgICAgICAgICAvLyB3aGlsZSAoZGlzdGFuY2VQbGF5ZXIxIDw9IHRoaXMuZGlzdGFuY2UpIHtcclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBsZXQgZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgSW5wdXRTeXN0ZW0uY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShkZWdyZWUgKyBhZGQsIHRoaXMuZGlzdGFuY2UpLnRvVmVjdG9yMygwKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgZGlyZWN0aW9uLm5vcm1hbGl6ZSgpO1xyXG5cclxuICAgIC8vICAgICAgICAgICAgIC8vICAgICBkaXJlY3Rpb24uc2NhbGUoKDEgLyBHYW1lLmZyYW1lUmF0ZSAqIHRoaXMucHJvcGVydGllcy5hdHRyaWJ1dGVzLnNwZWVkKSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbiwgdHJ1ZSk7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyAgICAgYWRkICs9IDU7XHJcbiAgICAvLyAgICAgICAgICAgICAvLyB9XHJcblxyXG4gICAgLy8gICAgICAgICB9XHJcbiAgICAvLyAgICAgfVxyXG4gICAgLy8gfVxyXG59IiwibmFtZXNwYWNlIEludGVyZmFjZXMge1xyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJU3Bhd25hYmxlIHtcclxuICAgICAgICBsaWZldGltZT86IG51bWJlcjtcclxuICAgICAgICBkZXNwYXduKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJS25vY2tiYWNrYWJsZSB7XHJcbiAgICAgICAgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkO1xyXG4gICAgICAgIGdldEtub2NrYmFjayhfa25vY2tiYWNrRm9yY2U6IG51bWJlciwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMpOiB2b2lkO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSUtpbGxhYmxlIHtcclxuICAgICAgICBvbkRlYXRoKCk6IHZvaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGludGVyZmFjZSBJRGFtYWdlYWJsZSB7XHJcbiAgICAgICAgZ2V0RGFtYWdlKCk6IHZvaWQ7XHJcbiAgICB9XHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElBdHRyaWJ1dGVWYWx1ZVBheWxvYWQge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXIgfCBib29sZWFuO1xyXG4gICAgICAgIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSU5ldHdvcmtPYmplY3RzIHtcclxuICAgICAgICBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIG5ldE9iamVjdE5vZGU6IEdhbWUuxpIuTm9kZTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEJ1bGxldFBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElJbnB1dEF2YXRhclBheWxvYWQge1xyXG4gICAgICAgIHRpY2s6IG51bWJlcjtcclxuICAgICAgICBpbnB1dFZlY3RvcjogR2FtZS7Gki5WZWN0b3IzO1xyXG4gICAgICAgIGRvZXNBYmlsaXR5OiBib29sZWFuO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBpbnRlcmZhY2UgSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgdGljazogbnVtYmVyO1xyXG4gICAgICAgIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gZXhwb3J0IGludGVyZmFjZSBCdWxsZXRJbmZvcm1hdGlvbiB7XHJcbiAgICAvLyAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgIC8vICAgICBoaXRQb2ludDogbnVtYmVyO1xyXG4gICAgLy8gICAgIGxpZmVUaW1lOiBudW1iZXI7XHJcbiAgICAvLyAgICAga25vY2tiYWNrRm9yY2U6IG51bWJlcjtcclxuICAgIC8vICAgICBwYXNzdGhyb3VnaEVuZW15OiBudW1iZXI7XHJcbiAgICAvLyAgICAgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vICAgICByb3RhdGlvbkRlZzogbnVtYmVyO1xyXG4gICAgLy8gICAgIGhvbWluZ1RhcmdldD86IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgIC8vIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tRXhpdHMge1xyXG4gICAgICAgIG5vcnRoOiBib29sZWFuO1xyXG4gICAgICAgIGVhc3Q6IGJvb2xlYW47XHJcbiAgICAgICAgc291dGg6IGJvb2xlYW47XHJcbiAgICAgICAgd2VzdDogYm9vbGVhbjtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElSb29tIHtcclxuICAgICAgICBjb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21TaXplOiBudW1iZXI7XHJcbiAgICAgICAgZXhpdHM6IElSb29tRXhpdHM7XHJcbiAgICAgICAgcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEU7XHJcbiAgICAgICAgdHJhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMztcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgaW50ZXJmYWNlIElNaW5pbWFwSW5mb3Mge1xyXG4gICAgICAgIGNvb3JkczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHJvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEl0ZW1zIHtcclxuICAgIGV4cG9ydCBlbnVtIElURU1JRCB7XHJcbiAgICAgICAgSUNFQlVDS0VUQ0hBTExFTkdFLFxyXG4gICAgICAgIERNR1VQLFxyXG4gICAgICAgIFNQRUVEVVAsXHJcbiAgICAgICAgUFJPSkVDVElMRVNVUCxcclxuICAgICAgICBIRUFMVEhVUCxcclxuICAgICAgICBTQ0FMRVVQLFxyXG4gICAgICAgIFNDQUxFRE9XTixcclxuICAgICAgICBBUk1PUlVQLFxyXG4gICAgICAgIEhPTUVDT01JTkcsXHJcbiAgICAgICAgVE9YSUNSRUxBVElPTlNISVAsXHJcbiAgICAgICAgVkFNUFksXHJcbiAgICAgICAgU0xPV1lTTE9XLFxyXG4gICAgICAgIFRIT1JTSEFNTUVSLFxyXG4gICAgICAgIEdFVFNUUk9OS08sXHJcbiAgICAgICAgR0VUV0VBS08sXHJcbiAgICAgICAgWklQWkFQLFxyXG4gICAgICAgIFRFU1RcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgbGV0IHR4dEljZUJ1Y2tldDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHREbWdVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRIZWFsdGhVcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRUb3hpY1JlbGF0aW9uc2hpcDogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTcGVlZFVwOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJdGVtIGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5JVEVNO1xyXG4gICAgICAgIGlkOiBJVEVNSUQ7XHJcbiAgICAgICAgcHVibGljIHJhcml0eTogUkFSSVRZO1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBkZXNjcmlwdGlvbjogc3RyaW5nO1xyXG4gICAgICAgIHB1YmxpYyBpbWdTcmM6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHRyYW5zZm9ybTogxpIuQ29tcG9uZW50VHJhbnNmb3JtID0gbmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpO1xyXG4gICAgICAgIHByaXZhdGUgcG9zaXRpb246IMaSLlZlY3RvcjI7IGdldCBnZXRQb3NpdGlvbigpOiDGki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMucG9zaXRpb24gfVxyXG4gICAgICAgIGJ1ZmY6IEJ1ZmYuQnVmZltdID0gW107XHJcbiAgICAgICAgcHJvdGVjdGVkIGNoYW5nZWRWYWx1ZTogbnVtYmVyO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IElURU1JRCwgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKElURU1JRFtfaWRdKTtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5uZXRJZCA9IE5ldHdvcmtpbmcuSWRNYW5hZ2VyKF9uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQoKSkpO1xyXG4gICAgICAgICAgICBsZXQgbWF0ZXJpYWw6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwid2hpdGVcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG1hdGVyaWFsKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmJ1ZmYucHVzaCh0aGlzLmdldEJ1ZmZCeUlkKCkpO1xyXG4gICAgICAgICAgICB0aGlzLnNldFRleHR1cmVCeUlkKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogSXRlbSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWRkUmFyaXR5QnVmZigpIHtcclxuICAgICAgICAgICAgbGV0IGJ1ZmYgPSBuZXcgQnVmZi5SYXJpdHlCdWZmKHRoaXMucmFyaXR5KTtcclxuICAgICAgICAgICAgYnVmZi5hZGRUb0l0ZW0odGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgZ2V0QnVmZkJ5SWQoKTogQnVmZi5CdWZmIHtcclxuICAgICAgICAgICAgbGV0IHRlbXA6IEl0ZW1zLkJ1ZmZJdGVtID0gZ2V0QnVmZkl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCdWZmLmdldEJ1ZmZCeUlkKEJ1ZmYuQlVGRklELlBPSVNPTik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5WQU1QWTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gQnVmZi5nZXRCdWZmQnlJZChCdWZmLkJVRkZJRC5CTEVFRElORyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5TTE9XWVNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuU0xPVyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5HRVRTVFJPTktPOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBCdWZmLmdldEJ1ZmZCeUlkKEJ1ZmYuQlVGRklELlNDQUxFVVApO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuR0VUV0VBS086XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuU0NBTEVET1dOKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBsb2FkVGV4dHVyZShfdGV4dHVyZTogxpIuVGV4dHVyZUltYWdlKTogdm9pZCB7XHJcbiAgICAgICAgICAgIGxldCBuZXdUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgICAgICAgICAgbmV3VHh0ID0gX3RleHR1cmU7XHJcbiAgICAgICAgICAgIGxldCBuZXdDb2F0OiDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQgPSBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKCk7XHJcbiAgICAgICAgICAgIG5ld0NvYXQudGV4dHVyZSA9IG5ld1R4dDtcclxuICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gbmV3TXRyO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgc2V0VGV4dHVyZUJ5SWQoKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSUNFQlVDS0VUQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0SWNlQnVja2V0KTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkRNR1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0RG1nVXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU1BFRURVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dFNwZWVkVXApO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5QUk9KRUNUSUxFU1VQOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKHR4dEhlYWx0aFVwKTtcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IGFkZCBjb3JyZWN0IHRleHR1cmUgYW5kIGNoYW5nZSBpbiBKU09OXHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVET1dOOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogYWRkIGNvcnJlY3QgdGV4dHVyZSBhbmQgY2hhbmdlIGluIEpTT05cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuSE9NRUNPTUlORzpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubG9hZFRleHR1cmUodHh0VG94aWNSZWxhdGlvbnNoaXApO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVkFNUFk6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuVEhPUlNIQU1NRVI6XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBhZGQgY29ycmVjdCB0ZXh0dXJlIGFuZCBjaGFuZ2UgaW4gSlNPTlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0UG9zaXRpb24oX3Bvc2l0aW9uOiDGki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnNldFBvc2l0aW9uKF9wb3NpdGlvbik7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBzcGF3bigpOiB2b2lkIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkl0ZW0odGhpcy5pZCwgdGhpcy5wb3NpdGlvbiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkZXNwYXduKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnJlbW92ZUl0ZW0odGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgYWRkSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgX2F2YXRhci5pdGVtcy5wdXNoKHRoaXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEludGVybmFsSXRlbSBleHRlbmRzIEl0ZW0ge1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgY2hvb3Nlbk9uZU5ldElkOiBudW1iZXI7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIGNvbnN0IGl0ZW0gPSBnZXRJbnRlcm5hbEl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICBpZiAoaXRlbSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubmFtZSA9IGl0ZW0ubmFtZTtcclxuICAgICAgICAgICAgICAgIHRoaXMudmFsdWUgPSBpdGVtLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZXNjcmlwdGlvbiA9IGl0ZW0uZGVzY3JpcHRpb247XHJcbiAgICAgICAgICAgICAgICB0aGlzLmltZ1NyYyA9IGl0ZW0uaW1nU3JjO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yYXJpdHkgPSBpdGVtLnJhcml0eTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRSYXJpdHlCdWZmKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0Q2hvb3Nlbk9uZU5ldElkKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuY2hvb3Nlbk9uZU5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyLCB0cnVlKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgcmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zZXRBdHRyaWJ1dGVzQnlJZChfYXZhdGFyLCBmYWxzZSk7XHJcbiAgICAgICAgICAgIF9hdmF0YXIuaXRlbXMuc3BsaWNlKF9hdmF0YXIuaXRlbXMuaW5kZXhPZihfYXZhdGFyLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IHRoaXMuaWQpKSwgMSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogSXRlbSB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgSW50ZXJuYWxJdGVtKHRoaXMuaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNldEF0dHJpYnV0ZXNCeUlkKF9hdmF0YXI6IFBsYXllci5QbGF5ZXIsIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmlkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5JQ0VCVUNLRVRDSEFMTEVOR0U6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jaGFuZ2VkVmFsdWUgPSBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gLSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24gPSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uICs9IHRoaXMuY2hhbmdlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb24sIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLkNPT0xET1dOUkVEVUNUSU9OIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuRE1HVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cyArPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMgLT0gdGhpcy52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuQVRUQUNLUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU1BFRURVUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWRWYWx1ZSA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdGhpcy52YWx1ZSkgLSBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQ7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zcGVlZCwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkIC09IHRoaXMuY2hhbmdlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLlNQRUVEIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuUFJPSkVDVElMRVNVUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50ICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCAtPSB0aGlzLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihfYXZhdGFyLndlYXBvbiwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IRUFMVEhVUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWRWYWx1ZSA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5tYXhIZWFsdGhQb2ludHMsIHRoaXMudmFsdWUpIC0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRNYXhQb2ludHMgPSBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cywgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhbW91bnQgPSBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzIC0gY3VycmVudE1heFBvaW50cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyArPSBhbW91bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtPSB0aGlzLmNoYW5nZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGN1cnJlbnRNYXhQb2ludHMgPSBfYXZhdGFyLmF0dHJpYnV0ZXMubWF4SGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYW1vdW50ID0gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAtIGN1cnJlbnRNYXhQb2ludHM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgLT0gYW1vdW50O1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5IRUFMVEhQT0lOVFMgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cywgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuTUFYSEVBTFRIUE9JTlRTIH0sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJVEVNSUQuU0NBTEVVUDpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWRWYWx1ZSA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSkgLSBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLmFkZFBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC09IHRoaXMuY2hhbmdlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnVwZGF0ZVNjYWxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRSB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYW5nZWRWYWx1ZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSkgLSBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlIC09IHRoaXMuY2hhbmdlZFZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLnVwZGF0ZVNjYWxlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKDxJbnRlcmZhY2VzLklBdHRyaWJ1dGVWYWx1ZVBheWxvYWQ+eyB2YWx1ZTogX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0eXBlOiBFbnRpdHkuQVRUUklCVVRFVFlQRS5TQ0FMRSB9LCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELkFSTU9SVVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmFybW9yICs9IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmFybW9yIC09IHRoaXMudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlRW50aXR5QXR0cmlidXRlcyg8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5hcm1vciwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuQVJNT1IgfSwgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5IT01FQ09NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlJhbmdlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYWltVHlwZSA9IFdlYXBvbnMuQUlNLkhPTUlORztcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmFpbVR5cGUgPSBXZWFwb25zLkFJTS5OT1JNQUw7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oX2F2YXRhci53ZWFwb24sIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyIGluc3RhbmNlb2YgUGxheWVyLlJhbmdlZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImNvb2xkb3duVGltZVwiLCBfYXZhdGFyLndlYXBvbi5nZXRDb29sRG93bi5nZXRNYXhDb29sRG93bi50b1N0cmluZygpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJhaW1UeXBlXCIsIFdlYXBvbnMuQUlNW19hdmF0YXIud2VhcG9uLmFpbVR5cGVdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oXCJidWxsZXRUeXBlXCIsIEJ1bGxldHMuQlVMTEVUVFlQRVtfYXZhdGFyLndlYXBvbi5idWxsZXRUeXBlXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwicHJvamVjdGlsZUFtb3VudFwiLCBfYXZhdGFyLndlYXBvbi5wcm9qZWN0aWxlQW1vdW50LnRvU3RyaW5nKCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uZ2V0Q29vbERvd24uc2V0TWF4Q29vbERvd24gPSAxMDAgKiA2MDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYWltVHlwZSA9IFdlYXBvbnMuQUlNLk5PUk1BTDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24uYnVsbGV0VHlwZSA9IEJ1bGxldHMuQlVMTEVUVFlQRS5USE9SU0hBTU1FUjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci53ZWFwb24ucHJvamVjdGlsZUFtb3VudCA9IDE7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIud2VhcG9uLmNhblNob290ID0gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKF9hdmF0YXIud2VhcG9uLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5aSVBaQVA6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW06IEJ1bGxldHMuWmlwWmFwT2JqZWN0ID0gbmV3IEJ1bGxldHMuWmlwWmFwT2JqZWN0KF9hdmF0YXIubmV0SWQsIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBuZXdJdGVtLnNwYXduKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHppcHphcCA9IDxCdWxsZXRzLlppcFphcE9iamVjdD5HYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmluZChpdGVtID0+ICg8QnVsbGV0cy5aaXBaYXBPYmplY3Q+aXRlbSkudHlwZSA9PSBCdWxsZXRzLkJVTExFVFRZUEUuWklQWkFQKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgemlwemFwLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIElURU1JRC5URVNUOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ldyBBYmlsaXR5LkFyZWFPZkVmZmVjdChBYmlsaXR5LkFPRVRZUEUuSEVBTFRIVVAsIG51bGwpLmFkZFRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICg8QWJpbGl0eS5BcmVhT2ZFZmZlY3Q+X2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxBYmlsaXR5LkFyZWFPZkVmZmVjdD5jaGlsZCkuaWQgPT0gQWJpbGl0eS5BT0VUWVBFLkhFQUxUSFVQKSkuZGVzcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQnVmZkl0ZW0gZXh0ZW5kcyBJdGVtIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXI7XHJcbiAgICAgICAgZHVyYXRpb246IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJVEVNSUQsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgICAgIGxldCB0ZW1wID0gZ2V0QnVmZkl0ZW1CeUlkKHRoaXMuaWQpO1xyXG4gICAgICAgICAgICB0aGlzLm5hbWUgPSB0ZW1wLm5hbWU7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSB0ZW1wLnZhbHVlO1xyXG4gICAgICAgICAgICB0aGlzLnRpY2tSYXRlID0gdGVtcC50aWNrUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IHRlbXAuZHVyYXRpb247XHJcbiAgICAgICAgICAgIHRoaXMuaW1nU3JjID0gdGVtcC5pbWdTcmM7XHJcbiAgICAgICAgICAgIHRoaXMucmFyaXR5ID0gdGVtcC5yYXJpdHk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZFJhcml0eUJ1ZmYoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyOiBQbGF5ZXIuUGxheWVyKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFkZEl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgdGhpcy5zZXRCdWZmQnlJZChfYXZhdGFyKTtcclxuICAgICAgICAgICAgdGhpcy5kZXNwYXduKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogQnVmZkl0ZW0ge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEJ1ZmZJdGVtKHRoaXMuaWQpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVmZkJ5SWQoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgSVRFTUlELlRPWElDUkVMQVRJT05TSElQOlxyXG4gICAgICAgICAgICAgICAgICAgIGxldCBuZXdCdWZmID0gdGhpcy5idWZmLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IEJ1ZmYuQlVGRklELlBPSVNPTikuY2xvbmUoKTtcclxuICAgICAgICAgICAgICAgICAgICBuZXdCdWZmLmR1cmF0aW9uID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICAgICAgICAgICg8QnVmZi5EYW1hZ2VCdWZmPm5ld0J1ZmYpLnZhbHVlID0gMC41O1xyXG4gICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYuYWRkVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0SW50ZXJuYWxJdGVtQnlJZChfaWQ6IElURU1JRCk6IEl0ZW1zLkludGVybmFsSXRlbSB7XHJcbiAgICAgICAgcmV0dXJuIEdhbWUuaW50ZXJuYWxJdGVtSlNPTi5maW5kKGl0ZW0gPT4gaXRlbS5pZCA9PSBfaWQpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRCdWZmSXRlbUJ5SWQoX2lkOiBJVEVNSUQpOiBJdGVtcy5CdWZmSXRlbSB7XHJcbiAgICAgICAgcmV0dXJuIEdhbWUuYnVmZkl0ZW1KU09OLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IF9pZCk7XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBJdGVtR2VuZXJhdG9yIHtcclxuICAgICAgICBwcml2YXRlIHN0YXRpYyBpdGVtUG9vbDogSXRlbXMuSXRlbVtdID0gW107XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgc3RhdGljIGZpbGxQb29sKCkge1xyXG4gICAgICAgICAgICBHYW1lLmludGVybmFsSXRlbUpTT04uZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbVBvb2wucHVzaChuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKGl0ZW0uaWQpKVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgR2FtZS5idWZmSXRlbUpTT04uZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaXRlbVBvb2wucHVzaChuZXcgQnVmZkl0ZW0oaXRlbS5pZCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0UmFuZG9tSXRlbSgpOiBJdGVtcy5JdGVtIHtcclxuICAgICAgICAgICAgbGV0IHBvc3NpYmxlSXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgICAgICBwb3NzaWJsZUl0ZW1zID0gdGhpcy5nZXRQb3NzaWJsZUl0ZW1zKCk7XHJcbiAgICAgICAgICAgIGxldCByYW5kb21JbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChwb3NzaWJsZUl0ZW1zLmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgbGV0IHJldHVybkl0ZW0gPSBwb3NzaWJsZUl0ZW1zW3JhbmRvbUluZGV4XTtcclxuICAgICAgICAgICAgLy8gdGhpcy5pdGVtUG9vbC5zcGxpY2UodGhpcy5pdGVtUG9vbC5pbmRleE9mKHJldHVybkl0ZW0pKTtcclxuICAgICAgICAgICAgcmV0dXJuIHJldHVybkl0ZW0uY2xvbmUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzdGF0aWMgZ2V0UmFuZG9tSXRlbUJ5UmFyaXR5KF9yYXJpdHk6IFJBUklUWSk6IEl0ZW1zLkl0ZW0ge1xyXG4gICAgICAgICAgICBsZXQgcG9zc2libGVJdGVtcyA9IHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gX3Jhcml0eSk7XHJcbiAgICAgICAgICAgIGxldCByYW5kb21JbmRleCA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChwb3NzaWJsZUl0ZW1zLmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgbGV0IHJldHVybkl0ZW0gPSBwb3NzaWJsZUl0ZW1zW3JhbmRvbUluZGV4XTtcclxuICAgICAgICAgICAgcmV0dXJuIHJldHVybkl0ZW0uY2xvbmUoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGdldFBvc3NpYmxlSXRlbXMoKTogSXRlbXMuSXRlbVtdIHtcclxuICAgICAgICAgICAgbGV0IGNob3NlblJhcml0eTogUkFSSVRZID0gdGhpcy5nZXRSYXJpdHkoKTtcclxuICAgICAgICAgICAgc3dpdGNoIChjaG9zZW5SYXJpdHkpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLkNPTU1PTjpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuQ09NTU9OKTtcclxuICAgICAgICAgICAgICAgIGNhc2UgUkFSSVRZLlJBUkU6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLlJBUkUpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBSQVJJVFkuRVBJQzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtUG9vbC5maWx0ZXIoaXRlbSA9PiBpdGVtLnJhcml0eSA9PSBSQVJJVFkuRVBJQyk7XHJcbiAgICAgICAgICAgICAgICBjYXNlIFJBUklUWS5MRUdFTkRBUlk6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbVBvb2wuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gUkFSSVRZLkxFR0VOREFSWSk7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiB0aGlzLml0ZW1Qb29sLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID0gUkFSSVRZLkNPTU1PTik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3RhdGljIGdldFJhcml0eSgpOiBSQVJJVFkge1xyXG4gICAgICAgICAgICBsZXQgcmFyaXR5TnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA+PSA1MCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFJBUklUWS5DT01NT047XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHJhcml0eU51bWJlciA+PSAyMCAmJiByYXJpdHlOdW1iZXIgPCA1MCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFJBUklUWS5SQVJFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyYXJpdHlOdW1iZXIgPj0gNSAmJiByYXJpdHlOdW1iZXIgPCAyMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIFJBUklUWS5FUElDO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChyYXJpdHlOdW1iZXIgPCA1KSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gUkFSSVRZLkxFR0VOREFSWTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gUkFSSVRZLkNPTU1PTjtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGVudW0gUkFSSVRZIHtcclxuICAgICAgICBDT01NT04sXHJcbiAgICAgICAgUkFSRSxcclxuICAgICAgICBFUElDLFxyXG4gICAgICAgIExFR0VOREFSWVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEFuaW1hdGlvbkdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRSZWRUaWNrV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U21hbGxUaWNrSWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRTbWFsbFRpY2tXYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRCYXRJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRTa2VsZXRvbklkbGU6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgdHh0U2tlbGV0b25XYWxrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VySWRsZTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VyV2FsazogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpO1xyXG4gICAgZXhwb3J0IGxldCB0eHRPZ2VyQXR0YWNrOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBsZXQgdHh0U3VtbW9uZXJJZGxlOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFN1bW1vbmVyU3VtbW9uOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICBleHBvcnQgbGV0IHR4dFN1bW1vbmVyVGVsZXBvcnQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGltcG9ydCDGkkFpZCA9IEZ1ZGdlQWlkO1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBBbmltYXRpb25Db250YWluZXIge1xyXG4gICAgICAgIGlkOiBFbnRpdHkuSUQ7XHJcbiAgICAgICAgYW5pbWF0aW9uczogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb25zID0ge307XHJcbiAgICAgICAgc2NhbGU6IFtzdHJpbmcsIG51bWJlcl1bXSA9IFtdO1xyXG4gICAgICAgIGZyYW1lUmF0ZTogW3N0cmluZywgbnVtYmVyXVtdID0gW107XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICAgICAgdGhpcy5nZXRBbmltYXRpb25CeUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGFkZEFuaW1hdGlvbihfYW5pOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbiwgX3NjYWxlOiBudW1iZXIsIF9mcmFtZVJhdGU6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLmFuaW1hdGlvbnNbX2FuaS5uYW1lXSA9IF9hbmk7XHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGUucHVzaChbX2FuaS5uYW1lLCBfc2NhbGVdKTtcclxuICAgICAgICAgICAgdGhpcy5mcmFtZVJhdGUucHVzaChbX2FuaS5uYW1lLCBfZnJhbWVSYXRlXSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRBbmltYXRpb25CeUlkKCkge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMuaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELkJBVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihiYXRJZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgYmF0SWRsZS5hbmltYXRpb25TY2FsZSwgYmF0SWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuUkVEVElDSzpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihyZWRUaWNrSWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHJlZFRpY2tJZGxlLmFuaW1hdGlvblNjYWxlLCByZWRUaWNrSWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHJlZFRpY2tXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgcmVkVGlja1dhbGsuYW5pbWF0aW9uU2NhbGUsIHJlZFRpY2tXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5TTUFMTFRJQ0s6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc21hbGxUaWNrSWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHNtYWxsVGlja0lkbGUuYW5pbWF0aW9uU2NhbGUsIHNtYWxsVGlja0lkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzbWFsbFRpY2tXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc21hbGxUaWNrV2Fsay5hbmltYXRpb25TY2FsZSwgc21hbGxUaWNrV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuU0tFTEVUT046XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc2tlbGV0b25JZGxlLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc2tlbGV0b25JZGxlLmFuaW1hdGlvblNjYWxlLCBza2VsZXRvbklkbGUuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihza2VsZXRvbldhbGsuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBza2VsZXRvbldhbGsuYW5pbWF0aW9uU2NhbGUsIHNrZWxldG9uV2Fsay5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuSUQuT0dFUjpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihvZ2VySWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIG9nZXJJZGxlLmFuaW1hdGlvblNjYWxlLCBvZ2VySWRsZS5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKG9nZXJXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgb2dlcldhbGsuYW5pbWF0aW9uU2NhbGUsIG9nZXJXYWxrLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24ob2dlckF0dGFjay5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIG9nZXJBdHRhY2suYW5pbWF0aW9uU2NhbGUsIG9nZXJBdHRhY2suZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNVTU1PTk9SOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVySWRsZS5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVySWRsZS5hbmltYXRpb25TY2FsZSwgc3VtbW9uZXJJZGxlLmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hZGRBbmltYXRpb24oc3VtbW9uZXJXYWxrLmdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbiwgc3VtbW9uZXJXYWxrLmFuaW1hdGlvblNjYWxlLCBzdW1tb25lcldhbGsuZnJhbWVSYXRlKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZEFuaW1hdGlvbihzdW1tb25lclN1bW1vbi5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24sIHN1bW1vbmVyU3VtbW9uLmFuaW1hdGlvblNjYWxlLCBzdW1tb25lclN1bW1vbi5mcmFtZVJhdGUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkQW5pbWF0aW9uKHN1bW1vbmVyVGVsZXBvcnQuZ2VuZXJhdGVkU3ByaXRlQW5pbWF0aW9uLCBzdW1tb25lclRlbGVwb3J0LmFuaW1hdGlvblNjYWxlLCBzdW1tb25lclRlbGVwb3J0LmZyYW1lUmF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGNsYXNzIE15QW5pbWF0aW9uQ2xhc3Mge1xyXG4gICAgICAgIHB1YmxpYyBpZDogRW50aXR5LklEO1xyXG4gICAgICAgIGFuaW1hdGlvbk5hbWU6IHN0cmluZztcclxuICAgICAgICBwdWJsaWMgc3ByaXRlU2hlZXQ6IMaSLlRleHR1cmVJbWFnZTtcclxuICAgICAgICBhbW91bnRPZkZyYW1lczogbnVtYmVyO1xyXG4gICAgICAgIGZyYW1lUmF0ZTogbnVtYmVyO1xyXG4gICAgICAgIGdlbmVyYXRlZFNwcml0ZUFuaW1hdGlvbjogxpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb247XHJcbiAgICAgICAgYW5pbWF0aW9uU2NhbGU6IG51bWJlcjtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hbmltYXRpb25OYW1lOiBzdHJpbmcsIF90ZXh0dXJlOiDGki5UZXh0dXJlSW1hZ2UsIF9hbW91bnRPZkZyYW1lczogbnVtYmVyLCBfZnJhbWVSYXRlOiBudW1iZXIsKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuYW5pbWF0aW9uTmFtZSA9IF9hbmltYXRpb25OYW1lO1xyXG4gICAgICAgICAgICB0aGlzLnNwcml0ZVNoZWV0ID0gX3RleHR1cmU7XHJcbiAgICAgICAgICAgIHRoaXMuZnJhbWVSYXRlID0gX2ZyYW1lUmF0ZTtcclxuICAgICAgICAgICAgdGhpcy5hbW91bnRPZkZyYW1lcyA9IF9hbW91bnRPZkZyYW1lcztcclxuICAgICAgICAgICAgZ2VuZXJhdGVBbmltYXRpb25Gcm9tR3JpZCh0aGlzKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vVE9ETzogZ2V0IGFuaW1hdGlvbiBzY2FsZVxyXG4gICAgfVxyXG5cclxuICAgIC8vI3JlZ2lvbiBzcHJpdGVTaGVldFxyXG4gICAgbGV0IGJhdElkbGU6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHJlZFRpY2tJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHJlZFRpY2tXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG5cclxuICAgIGxldCBzbWFsbFRpY2tJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IHNtYWxsVGlja1dhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHNrZWxldG9uSWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBza2VsZXRvbldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IG9nZXJJZGxlOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IG9nZXJXYWxrOiBNeUFuaW1hdGlvbkNsYXNzO1xyXG4gICAgbGV0IG9nZXJBdHRhY2s6IE15QW5pbWF0aW9uQ2xhc3M7XHJcblxyXG4gICAgbGV0IHN1bW1vbmVySWRsZTogTXlBbmltYXRpb25DbGFzcztcclxuICAgIGxldCBzdW1tb25lcldhbGs6IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc3VtbW9uZXJTdW1tb246IE15QW5pbWF0aW9uQ2xhc3M7XHJcbiAgICBsZXQgc3VtbW9uZXJUZWxlcG9ydDogTXlBbmltYXRpb25DbGFzcztcclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gQW5pbWF0aW9uQ29udGFpbmVyXHJcbiAgICBsZXQgYmF0QW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgcmVkVGlja0FuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IHNtYWxsVGlja0FuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IHNrZWxldG9uQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICBsZXQgb2dlckFuaW1hdGlvbjogQW5pbWF0aW9uQ29udGFpbmVyO1xyXG4gICAgbGV0IHN1bW1vbmVyQW5pbWF0aW9uOiBBbmltYXRpb25Db250YWluZXI7XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2VuZXJhdGVBbmltYXRpb25PYmplY3RzKCkge1xyXG5cclxuICAgICAgICBiYXRJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELkJBVCwgXCJpZGxlXCIsIHR4dEJhdElkbGUsIDQsIDEyKTtcclxuXHJcbiAgICAgICAgcmVkVGlja0lkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuUkVEVElDSywgXCJpZGxlXCIsIHR4dFJlZFRpY2tJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgcmVkVGlja1dhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuUkVEVElDSywgXCJ3YWxrXCIsIHR4dFJlZFRpY2tXYWxrLCA0LCAxNik7XHJcblxyXG4gICAgICAgIHNtYWxsVGlja0lkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU01BTExUSUNLLCBcImlkbGVcIiwgdHh0U21hbGxUaWNrSWRsZSwgNiwgMTIpO1xyXG4gICAgICAgIHNtYWxsVGlja1dhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU01BTExUSUNLLCBcIndhbGtcIiwgdHh0U21hbGxUaWNrV2FsaywgNCwgMTIpO1xyXG5cclxuICAgICAgICBza2VsZXRvbklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU0tFTEVUT04sIFwiaWRsZVwiLCB0eHRTa2VsZXRvbklkbGUsIDUsIDEyKTtcclxuICAgICAgICBza2VsZXRvbldhbGsgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU0tFTEVUT04sIFwid2Fsa1wiLCB0eHRTa2VsZXRvbldhbGssIDcsIDEyKTtcclxuXHJcbiAgICAgICAgb2dlcklkbGUgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuT0dFUiwgXCJpZGxlXCIsIHR4dE9nZXJJZGxlLCA1LCA2KTtcclxuICAgICAgICBvZ2VyV2FsayA9IG5ldyBNeUFuaW1hdGlvbkNsYXNzKEVudGl0eS5JRC5PR0VSLCBcIndhbGtcIiwgdHh0T2dlcldhbGssIDYsIDYpO1xyXG4gICAgICAgIG9nZXJBdHRhY2sgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuT0dFUiwgXCJhdHRhY2tcIiwgdHh0T2dlckF0dGFjaywgMTAsIDEyKTtcclxuXHJcbiAgICAgICAgc3VtbW9uZXJJZGxlID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNVTU1PTk9SLCBcImlkbGVcIiwgdHh0U3VtbW9uZXJJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc3VtbW9uZXJXYWxrID0gbmV3IE15QW5pbWF0aW9uQ2xhc3MoRW50aXR5LklELlNVTU1PTk9SLCBcIndhbGtcIiwgdHh0U3VtbW9uZXJJZGxlLCA2LCAxMik7XHJcbiAgICAgICAgc3VtbW9uZXJTdW1tb24gPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwic3VtbW9uXCIsIHR4dFN1bW1vbmVyU3VtbW9uLCAxMywgMTIpO1xyXG4gICAgICAgIHN1bW1vbmVyVGVsZXBvcnQgPSBuZXcgTXlBbmltYXRpb25DbGFzcyhFbnRpdHkuSUQuU1VNTU9OT1IsIFwidGVsZXBvcnRcIiwgdHh0U3VtbW9uZXJUZWxlcG9ydCwgNiwgMTIpO1xyXG5cclxuXHJcblxyXG4gICAgICAgIGJhdEFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELkJBVCk7XHJcbiAgICAgICAgcmVkVGlja0FuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlJFRFRJQ0spO1xyXG4gICAgICAgIHNtYWxsVGlja0FuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELlNNQUxMVElDSyk7XHJcbiAgICAgICAgc2tlbGV0b25BbmltYXRpb24gPSBuZXcgQW5pbWF0aW9uQ29udGFpbmVyKEVudGl0eS5JRC5TS0VMRVRPTik7XHJcbiAgICAgICAgb2dlckFuaW1hdGlvbiA9IG5ldyBBbmltYXRpb25Db250YWluZXIoRW50aXR5LklELk9HRVIpO1xyXG4gICAgICAgIHN1bW1vbmVyQW5pbWF0aW9uID0gbmV3IEFuaW1hdGlvbkNvbnRhaW5lcihFbnRpdHkuSUQuU1VNTU9OT1IpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRBbmltYXRpb25CeUlkKF9pZDogRW50aXR5LklEKTogQW5pbWF0aW9uQ29udGFpbmVyIHtcclxuICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5CQVQ6XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYmF0QW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5SRURUSUNLOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlZFRpY2tBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNNQUxMVElDSzpcclxuICAgICAgICAgICAgICAgIHJldHVybiBzbWFsbFRpY2tBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNLRUxFVE9OOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHNrZWxldG9uQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBjYXNlIEVudGl0eS5JRC5PR0VSOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG9nZXJBbmltYXRpb247XHJcbiAgICAgICAgICAgIGNhc2UgRW50aXR5LklELlNVTU1PTk9SOlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHN1bW1vbmVyQW5pbWF0aW9uO1xyXG4gICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcblxyXG4gICAgZnVuY3Rpb24gZ2V0UGl4ZWxSYXRpbyhfd2lkdGg6IG51bWJlciwgX2hlaWdodDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbWF4ID0gTWF0aC5tYXgoX3dpZHRoLCBfaGVpZ2h0KTtcclxuICAgICAgICBsZXQgbWluID0gTWF0aC5taW4oX3dpZHRoLCBfaGVpZ2h0KTtcclxuXHJcbiAgICAgICAgbGV0IHNjYWxlID0gMSAvIG1heCAqIG1pbjtcclxuICAgICAgICByZXR1cm4gc2NhbGU7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdlbmVyYXRlQW5pbWF0aW9uRnJvbUdyaWQoX2NsYXNzOiBNeUFuaW1hdGlvbkNsYXNzKSB7XHJcbiAgICAgICAgbGV0IGNscldoaXRlOiDGki5Db2xvciA9IMaSLkNvbG9yLkNTUyhcIndoaXRlXCIpO1xyXG4gICAgICAgIGxldCBjb2F0ZWRTcHJpdGVTaGVldDogxpIuQ29hdFRleHR1cmVkID0gbmV3IMaSLkNvYXRUZXh0dXJlZChjbHJXaGl0ZSwgX2NsYXNzLnNwcml0ZVNoZWV0KTtcclxuICAgICAgICBsZXQgd2lkdGg6IG51bWJlciA9IF9jbGFzcy5zcHJpdGVTaGVldC50ZXhJbWFnZVNvdXJjZS53aWR0aCAvIF9jbGFzcy5hbW91bnRPZkZyYW1lcztcclxuICAgICAgICBsZXQgaGVpZ2h0OiBudW1iZXIgPSBfY2xhc3Muc3ByaXRlU2hlZXQudGV4SW1hZ2VTb3VyY2UuaGVpZ2h0O1xyXG4gICAgICAgIGxldCBjcmVhdGVkQW5pbWF0aW9uOiDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbiA9IG5ldyDGkkFpZC5TcHJpdGVTaGVldEFuaW1hdGlvbihfY2xhc3MuYW5pbWF0aW9uTmFtZSwgY29hdGVkU3ByaXRlU2hlZXQpO1xyXG4gICAgICAgIGNyZWF0ZWRBbmltYXRpb24uZ2VuZXJhdGVCeUdyaWQoxpIuUmVjdGFuZ2xlLkdFVCgwLCAwLCB3aWR0aCwgaGVpZ2h0KSwgX2NsYXNzLmFtb3VudE9mRnJhbWVzLCAzMiwgxpIuT1JJR0lOMkQuQ0VOVEVSLCDGki5WZWN0b3IyLlgod2lkdGgpKTtcclxuICAgICAgICBfY2xhc3MuYW5pbWF0aW9uU2NhbGUgPSBnZXRQaXhlbFJhdGlvKHdpZHRoLCBoZWlnaHQpO1xyXG4gICAgICAgIF9jbGFzcy5nZW5lcmF0ZWRTcHJpdGVBbmltYXRpb24gPSBjcmVhdGVkQW5pbWF0aW9uO1xyXG4gICAgfVxyXG5cclxuXHJcbn1cclxuXHJcbiIsIm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcm90ZWN0ZWQgdGltZXI6IG51bWJlciA9IDA7XHJcbiAgICAgICAgcHJvdGVjdGVkIGN1cnJlbnRUaWNrOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIHB1YmxpYyBtaW5UaW1lQmV0d2VlblRpY2tzOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGdhbWVUaWNrUmF0ZTogbnVtYmVyID0gNjIuNTtcclxuICAgICAgICBwcm90ZWN0ZWQgYnVmZmVyU2l6ZTogbnVtYmVyID0gMTAyNDtcclxuICAgICAgICBwcm90ZWN0ZWQgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogR2FtZS7Gki5Ob2RlIHsgcmV0dXJuIEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSB0aGlzLm93bmVyTmV0SWQpLm5ldE9iamVjdE5vZGUgfTtcclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXRlQnVmZmVyOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWRbXTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MgPSAxIC8gdGhpcy5nYW1lVGlja1JhdGU7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBoYW5kbGVUaWNrKCkge1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHByb2Nlc3NNb3ZlbWVudChfaW5wdXQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCk6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgfS8vI3JlZ2lvbiAgYnVsbGV0IFByZWRpY3Rpb25cclxuICAgIGFic3RyYWN0IGNsYXNzIEJ1bGxldFByZWRpY3Rpb24gZXh0ZW5kcyBQcmVkaWN0aW9uIHtcclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KGlucHV0OiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQpOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQge1xyXG4gICAgICAgICAgICBsZXQgY2xvbmVJbnB1dFZlY3RvciA9IGlucHV0LmlucHV0VmVjdG9yLmNsb25lO1xyXG4gICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldCA9IDxCdWxsZXRzLkJ1bGxldD50aGlzLm93bmVyO1xyXG4gICAgICAgICAgICBidWxsZXQubW92ZShjbG9uZUlucHV0VmVjdG9yKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdTdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHsgdGljazogaW5wdXQudGljaywgcG9zaXRpb246IGJ1bGxldC5tdHhMb2NhbC50cmFuc2xhdGlvbiB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXdTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBTZXJ2ZXJCdWxsZXRQcmVkaWN0aW9uIGV4dGVuZHMgQnVsbGV0UHJlZGljdGlvbiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dFF1ZXVlOiBRdWV1ZSA9IG5ldyBRdWV1ZSgpO1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlRW50aXR5VG9DaGVjayhfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRpbWVyICs9IEdhbWUuZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lciA+PSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVUaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaWNrKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSAtMTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuaW5wdXRRdWV1ZS5nZXRRdWV1ZUxlbmd0aCgpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkID0gPEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZD50aGlzLmlucHV0UXVldWUuZGVxdWV1ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4ID0gaW5wdXRQYXlsb2FkLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJ1ZmZlckluZGV4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAvL1NlbmQgdG8gY2xpZW50IG5ldyBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kU2VydmVyQnVmZmVyKHRoaXMub3duZXJOZXRJZCwgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25DbGllbnRJbnB1dChpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UXVldWUuZW5xdWV1ZShpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQ2xpZW50QnVsbGV0UHJlZGljdGlvbiBleHRlbmRzIEJ1bGxldFByZWRpY3Rpb24ge1xyXG4gICAgICAgIHByaXZhdGUgaW5wdXRCdWZmZXI6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZFtdO1xyXG4gICAgICAgIHByaXZhdGUgbGF0ZXN0U2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGxhc3RQcm9jZXNzZWRTdGF0ZTogSW50ZXJmYWNlcy5JU3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIHByaXZhdGUgZmx5RGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHByaXZhdGUgQXN5bmNUb2xlcmFuY2U6IG51bWJlciA9IDAuMjtcclxuXHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX293bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyID0gbmV3IEFycmF5PEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZD4odGhpcy5idWZmZXJTaXplKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbHlEaXJlY3Rpb24gPSAoPEJ1bGxldHMuQnVsbGV0PnRoaXMub3duZXIpLmZseURpcmVjdGlvbjtcclxuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY2FudCBmaW5kIG93bmVyXCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMudGltZXIgKz0gR2FtZS5kZWx0YVRpbWU7XHJcbiAgICAgICAgICAgIHdoaWxlICh0aGlzLnRpbWVyID49IHRoaXMubWluVGltZUJldHdlZW5UaWNrcykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy50aW1lciAtPSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3M7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmhhbmRsZVRpY2soKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFRpY2srKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBpZiAodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSAhPSB0aGlzLmxhc3RQcm9jZXNzZWRTdGF0ZSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aGlzLmN1cnJlbnRUaWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQgPSB7IHRpY2s6IHRoaXMuY3VycmVudFRpY2ssIGlucHV0VmVjdG9yOiB0aGlzLmZseURpcmVjdGlvbiB9O1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0QnVmZmVyW2J1ZmZlckluZGV4XSA9IGlucHV0UGF5bG9hZDtcclxuICAgICAgICAgICAgLy8gY29uc29sZS5sb2coaW5wdXRQYXlsb2FkLnRpY2sgKyBcIl9fX1wiICsgaW5wdXRQYXlsb2FkLmlucHV0VmVjdG9yKTtcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0gPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpO1xyXG5cclxuICAgICAgICAgICAgLy9zZW5kIGlucHV0UGF5bG9hZCB0byBob3N0XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcuc2VuZEJ1bGxldElucHV0KHRoaXMub3duZXJOZXRJZCwgaW5wdXRQYXlsb2FkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvblNlcnZlck1vdmVtZW50U3RhdGUoX3NlcnZlclN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZSA9IF9zZXJ2ZXJTdGF0ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMubGFzdFByb2Nlc3NlZFN0YXRlID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgIGxldCBzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4ID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS50aWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICBsZXQgcG9zaXRpb25FcnJvcjogbnVtYmVyID0gR2FtZS7Gki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbiwgdGhpcy5zdGF0ZUJ1ZmZlcltzZXJ2ZXJTdGF0ZUJ1ZmZlckluZGV4XS5wb3NpdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICBpZiAocG9zaXRpb25FcnJvciA+IHRoaXMuQXN5bmNUb2xlcmFuY2UpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUud2Fybih0aGlzLm93bmVyLm5hbWUgKyBcIiBuZWVkIHRvIGJlIHVwZGF0ZWQgdG86IFg6XCIgKyB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLnggKyBcIiBZOiBcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbjtcclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdID0gdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgdGlja1RvUHJvY2VzcyA9ICh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgKyAxKTtcclxuXHJcbiAgICAgICAgICAgICAgICB3aGlsZSAodGlja1RvUHJvY2VzcyA8IHRoaXMuY3VycmVudFRpY2spIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudCh0aGlzLmlucHV0QnVmZmVyW3RpY2tUb1Byb2Nlc3MgJSB0aGlzLmJ1ZmZlclNpemVdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZlckluZGV4ID0gdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGlja1RvUHJvY2VzcysrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbiAgICAvLyNyZWdpb24gIGF2YXRhciBQcmVjZGljdGlvblxyXG4gICAgYWJzdHJhY3QgY2xhc3MgQXZhdGFyUHJlZGljdGlvbiBleHRlbmRzIFByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgcHJvY2Vzc01vdmVtZW50KGlucHV0OiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQpOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQge1xyXG4gICAgICAgICAgICBsZXQgY2xvbmVJbnB1dFZlY3RvciA9IGlucHV0LmlucHV0VmVjdG9yLmNsb25lO1xyXG4gICAgICAgICAgICBpZiAoY2xvbmVJbnB1dFZlY3Rvci5tYWduaXR1ZGUgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBjbG9uZUlucHV0VmVjdG9yLm5vcm1hbGl6ZSgpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ICYmIGlucHV0LmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+dGhpcy5vd25lcikuZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj50aGlzLm93bmVyKS5tb3ZlKGNsb25lSW5wdXRWZWN0b3IpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIGxldCBuZXdTdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHsgdGljazogaW5wdXQudGljaywgcG9zaXRpb246IHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24gfVxyXG4gICAgICAgICAgICByZXR1cm4gbmV3U3RhdGVQYXlsb2FkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQ2xpZW50UHJlZGljdGlvbiBleHRlbmRzIEF2YXRhclByZWRpY3Rpb24ge1xyXG5cclxuICAgICAgICBwcml2YXRlIGlucHV0QnVmZmVyOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWRbXTtcclxuICAgICAgICBwcml2YXRlIGxhdGVzdFNlcnZlclN0YXRlOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBsYXN0UHJvY2Vzc2VkU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZDtcclxuICAgICAgICBwcml2YXRlIGhvcml6b250YWxJbnB1dDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgdmVydGljYWxJbnB1dDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBkb2VzQWJpbGl0eTogYm9vbGVhbjtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBBc3luY1RvbGVyYW5jZTogbnVtYmVyID0gMC4xO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX293bmVyTmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfb3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMuaW5wdXRCdWZmZXIgPSBuZXcgQXJyYXk8SW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkPih0aGlzLmJ1ZmZlclNpemUpO1xyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaG9yaXpvbnRhbElucHV0ID0gSW5wdXRTeXN0ZW0ubW92ZSgpLng7XHJcbiAgICAgICAgICAgIHRoaXMudmVydGljYWxJbnB1dCA9IElucHV0U3lzdGVtLm1vdmUoKS55O1xyXG4gICAgICAgICAgICB0aGlzLnRpbWVyICs9IEdhbWUuZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lciA+PSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVUaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaWNrKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBoYW5kbGVUaWNrKCkge1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUgIT0gdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuaGFuZGxlU2VydmVyUmVjb25jaWxpYXRpb24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aGlzLmN1cnJlbnRUaWNrICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICB0aGlzLnN3aXRjaEF2YXRhckFiaWxpdHlTdGF0ZSgpO1xyXG4gICAgICAgICAgICBsZXQgaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgPSB7IHRpY2s6IHRoaXMuY3VycmVudFRpY2ssIGlucHV0VmVjdG9yOiBuZXcgxpIuVmVjdG9yMyh0aGlzLmhvcml6b250YWxJbnB1dCwgdGhpcy52ZXJ0aWNhbElucHV0LCAwKSwgZG9lc0FiaWxpdHk6IHRoaXMuZG9lc0FiaWxpdHkgfTtcclxuICAgICAgICAgICAgdGhpcy5pbnB1dEJ1ZmZlcltidWZmZXJJbmRleF0gPSBpbnB1dFBheWxvYWQ7XHJcbiAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGlucHV0UGF5bG9hZC50aWNrICsgXCJfX19cIiArIGlucHV0UGF5bG9hZC5pbnB1dFZlY3Rvci5jbG9uZSk7XHJcbiAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gdGhpcy5wcm9jZXNzTW92ZW1lbnQoaW5wdXRQYXlsb2FkKTtcclxuXHJcbiAgICAgICAgICAgIC8vc2VuZCBpbnB1dFBheWxvYWQgdG8gaG9zdFxyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNlbmRDbGllbnRJbnB1dCh0aGlzLm93bmVyTmV0SWQsIGlucHV0UGF5bG9hZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzd2l0Y2hBdmF0YXJBYmlsaXR5U3RhdGUoKSB7XHJcbiAgICAgICAgICAgIGlmICgoPEVudGl0eS5FbnRpdHk+dGhpcy5vd25lcikuaWQgPT0gRW50aXR5LklELlJBTkdFRCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9ICg8UGxheWVyLlJhbmdlZD50aGlzLm93bmVyKS5kYXNoLmRvZXNBYmlsaXR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9ICg8UGxheWVyLk1lbGVlPnRoaXMub3duZXIpLmJsb2NrLmRvZXNBYmlsaXR5O1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIG9uU2VydmVyTW92ZW1lbnRTdGF0ZShfc2VydmVyU3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmxhdGVzdFNlcnZlclN0YXRlID0gX3NlcnZlclN0YXRlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBoYW5kbGVTZXJ2ZXJSZWNvbmNpbGlhdGlvbigpIHtcclxuICAgICAgICAgICAgdGhpcy5sYXN0UHJvY2Vzc2VkU3RhdGUgPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgbGV0IHNlcnZlclN0YXRlQnVmZmVySW5kZXggPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgIGxldCBwb3NpdGlvbkVycm9yOiBudW1iZXIgPSBHYW1lLsaSLlZlY3RvcjMuRElGRkVSRU5DRSh0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uLCB0aGlzLnN0YXRlQnVmZmVyW3NlcnZlclN0YXRlQnVmZmVySW5kZXhdLnBvc2l0aW9uKS5tYWduaXR1ZGU7XHJcbiAgICAgICAgICAgIGlmIChwb3NpdGlvbkVycm9yID4gdGhpcy5Bc3luY1RvbGVyYW5jZSkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS53YXJuKFwieW91IG5lZWQgdG8gYmUgdXBkYXRlZCB0bzogWDpcIiArIHRoaXMubGF0ZXN0U2VydmVyU3RhdGUucG9zaXRpb24ueCArIFwiIFk6IFwiICsgdGhpcy5sYXRlc3RTZXJ2ZXJTdGF0ZS5wb3NpdGlvbi55KTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlLnBvc2l0aW9uO1xyXG5cclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbc2VydmVyU3RhdGVCdWZmZXJJbmRleF0gPSB0aGlzLmxhdGVzdFNlcnZlclN0YXRlO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCB0aWNrVG9Qcm9jZXNzID0gKHRoaXMubGF0ZXN0U2VydmVyU3RhdGUudGljayArIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIHdoaWxlICh0aWNrVG9Qcm9jZXNzIDwgdGhpcy5jdXJyZW50VGljaykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBzdGF0ZVBheWxvYWQ6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHRoaXMucHJvY2Vzc01vdmVtZW50KHRoaXMuaW5wdXRCdWZmZXJbdGlja1RvUHJvY2VzcyAlIHRoaXMuYnVmZmVyU2l6ZV0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSB0aWNrVG9Qcm9jZXNzICUgdGhpcy5idWZmZXJTaXplO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVCdWZmZXJbYnVmZmVySW5kZXhdID0gc3RhdGVQYXlsb2FkO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICB0aWNrVG9Qcm9jZXNzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFNlcnZlclByZWRpY3Rpb24gZXh0ZW5kcyBBdmF0YXJQcmVkaWN0aW9uIHtcclxuXHJcbiAgICAgICAgcHJpdmF0ZSBpbnB1dFF1ZXVlOiBRdWV1ZSA9IG5ldyBRdWV1ZSgpO1xyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlRW50aXR5VG9DaGVjayhfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfbmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRpbWVyICs9IEdhbWUuZGVsdGFUaW1lO1xyXG4gICAgICAgICAgICB3aGlsZSAodGhpcy50aW1lciA+PSB0aGlzLm1pblRpbWVCZXR3ZWVuVGlja3MpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGltZXIgLT0gdGhpcy5taW5UaW1lQmV0d2VlblRpY2tzO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5oYW5kbGVUaWNrKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRUaWNrKys7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGhhbmRsZVRpY2soKSB7XHJcblxyXG4gICAgICAgICAgICBsZXQgYnVmZmVySW5kZXggPSAtMTtcclxuICAgICAgICAgICAgd2hpbGUgKHRoaXMuaW5wdXRRdWV1ZS5nZXRRdWV1ZUxlbmd0aCgpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IGlucHV0UGF5bG9hZDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkID0gPEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZD50aGlzLmlucHV0UXVldWUuZGVxdWV1ZSgpO1xyXG5cclxuICAgICAgICAgICAgICAgIGJ1ZmZlckluZGV4ID0gaW5wdXRQYXlsb2FkLnRpY2sgJSB0aGlzLmJ1ZmZlclNpemU7XHJcbiAgICAgICAgICAgICAgICBsZXQgc3RhdGVQYXlsb2FkOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQgPSB0aGlzLnByb2Nlc3NNb3ZlbWVudChpbnB1dFBheWxvYWQpXHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlQnVmZmVyW2J1ZmZlckluZGV4XSA9IHN0YXRlUGF5bG9hZDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKGJ1ZmZlckluZGV4ICE9IC0xKSB7XHJcbiAgICAgICAgICAgICAgICAvL1NlbmQgdG8gY2xpZW50IG5ldyBwb3NpdGlvblxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zZW5kU2VydmVyQnVmZmVyKHRoaXMub3duZXJOZXRJZCwgdGhpcy5zdGF0ZUJ1ZmZlcltidWZmZXJJbmRleF0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25DbGllbnRJbnB1dChpbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QXZhdGFyUGF5bG9hZCkge1xyXG4gICAgICAgICAgICB0aGlzLmlucHV0UXVldWUuZW5xdWV1ZShpbnB1dFBheWxvYWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICBjbGFzcyBRdWV1ZSB7XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtczogYW55W107XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gW107XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBlbnF1ZXVlKF9pdGVtOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQgfCBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQpIHtcclxuICAgICAgICAgICAgdGhpcy5pdGVtcy5wdXNoKF9pdGVtKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlcXVldWUoKTogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkIHwgSW50ZXJmYWNlcy5JSW5wdXRCdWxsZXRQYXlsb2FkIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXMuc2hpZnQoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldFF1ZXVlTGVuZ3RoKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5pdGVtcy5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBnZXRJdGVtcygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuaXRlbXM7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIm5hbWVzcGFjZSBBYmlsaXR5IHtcclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBBYmlsaXR5IHtcclxuICAgICAgICBwcm90ZWN0ZWQgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgY29vbGRvd246IENvb2xkb3duO1xyXG4gICAgICAgIHByb3RlY3RlZCBhYmlsaXR5Q291bnQ6IG51bWJlcjtcclxuICAgICAgICBwcm90ZWN0ZWQgY3VycmVudGFiaWxpdHlDb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByb3RlY3RlZCBkdXJhdGlvbjogQ29vbGRvd247XHJcbiAgICAgICAgcHVibGljIGRvZXNBYmlsaXR5OiBib29sZWFuID0gZmFsc2U7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9vd25lck5ldElkOiBudW1iZXIsIF9kdXJhdGlvbjogbnVtYmVyLCBfYWJpbGl0eUNvdW50OiBudW1iZXIsIF9jb29sZG93blRpbWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyTmV0SWQgPSBfb3duZXJOZXRJZDtcclxuICAgICAgICAgICAgdGhpcy5hYmlsaXR5Q291bnQgPSBfYWJpbGl0eUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IG5ldyBDb29sZG93bihfZHVyYXRpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmNvb2xkb3duID0gbmV3IENvb2xkb3duKF9jb29sZG93blRpbWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVBYmlsaXR5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGVBYmlsaXR5KCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5kb2VzQWJpbGl0eSAmJiAhdGhpcy5kdXJhdGlvbi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9IGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIC8vZG8gc3R1ZmZcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xkb3duLmhhc0Nvb2xEb3duICYmIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRhYmlsaXR5Q291bnQgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24gJiYgdGhpcy5jdXJyZW50YWJpbGl0eUNvdW50ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb2VzQWJpbGl0eSA9IHRydWU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmFjdGl2YXRlQWJpbGl0eSgpXHJcbiAgICAgICAgICAgICAgICB0aGlzLmR1cmF0aW9uLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudGFiaWxpdHlDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudGFiaWxpdHlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIGhhc0Nvb2xkb3duKCk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb29sZG93bi5oYXNDb29sRG93bjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIEdhbWUuxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuTE9PUF9GUkFNRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgZGVhY3RpdmF0ZUFiaWxpdHkoKSB7XHJcbiAgICAgICAgICAgIEdhbWUuxpIuTG9vcC5yZW1vdmVFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuTE9PUF9GUkFNRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIEJsb2NrIGV4dGVuZHMgQWJpbGl0eSB7XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGRlYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5kZWFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBEYXNoIGV4dGVuZHMgQWJpbGl0eSB7XHJcbiAgICAgICAgc3BlZWQ6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyLCBfZHVyYXRpb246IG51bWJlciwgX2FiaWxpdHlDb3VudDogbnVtYmVyLCBfY29vbGRvd25UaW1lOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9vd25lck5ldElkLCBfZHVyYXRpb24sIF9hYmlsaXR5Q291bnQsIF9jb29sZG93blRpbWUpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gX3NwZWVkO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5hY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJhY3RpdmF0ZVwiKTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLmhpdGFibGUgPSBmYWxzZTtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5hdHRyaWJ1dGVzLnNwZWVkICo9IHRoaXMuc3BlZWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHByb3RlY3RlZCBkZWFjdGl2YXRlQWJpbGl0eSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZGVhY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgY29uc29sZS5sb2coXCJkZWFjdGl2YXRlXCIpO1xyXG4gICAgICAgICAgICB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuaGl0YWJsZSA9IHRydWU7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXIuYXR0cmlidXRlcy5zcGVlZCAvPSB0aGlzLnNwZWVkO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgU3Bhd25TdW1tb25lcnMgZXh0ZW5kcyBBYmlsaXR5IHtcclxuICAgICAgICBwcml2YXRlIHNwYXduUmFkaXVzOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHByb3RlY3RlZCBhY3RpdmF0ZUFiaWxpdHkoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHN1cGVyLmFjdGl2YXRlQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb246IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKHRoaXMub3duZXIubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIE1hdGgucmFuZG9tKCkgKiB0aGlzLnNwYXduUmFkaXVzLCB0aGlzLm93bmVyLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgKyAyKVxyXG4gICAgICAgICAgICAgICAgaWYgKE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSkgPiAwLjUpIHtcclxuICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIuc3Bhd25CeUlEKEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1JBRERTLCBFbnRpdHkuSUQuQkFULCBwb3NpdGlvbiwgR2FtZS5hdmF0YXIxLCBudWxsKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgRW5lbXlTcGF3bmVyLnNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLlNVTU1PTk9SQUREUywgRW50aXR5LklELkJBVCwgcG9zaXRpb24sIEdhbWUuYXZhdGFyMiwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIGNpcmNsZVNob290IGV4dGVuZHMgQWJpbGl0eSB7XHJcbiAgICAgICAgcHVibGljIGJ1bGxldEFtb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgYnVsbGV0czogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgYWN0aXZhdGVBYmlsaXR5KCk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5hY3RpdmF0ZUFiaWxpdHkoKTtcclxuICAgICAgICAgICAgdGhpcy5idWxsZXRzID0gW107XHJcbiAgICAgICAgICAgIGZvciAobGV0IGkgPSAwOyBpIDwgdGhpcy5idWxsZXRBbW91bnQ7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5idWxsZXRzLnB1c2gobmV3IEJ1bGxldHMuQnVsbGV0KEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgdGhpcy5vd25lci5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgR2FtZS7Gki5WZWN0b3IzLlpFUk8oKSwgdGhpcy5vd25lck5ldElkKSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1bGxldHNbaV0ubXR4TG9jYWwucm90YXRlWigoMzYwIC8gdGhpcy5idWxsZXRBbW91bnQgKiBpKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLmJ1bGxldEFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHRoaXMuYnVsbGV0c1tpXSk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduQnVsbGV0KFdlYXBvbnMuQUlNLk5PUk1BTCwgdGhpcy5idWxsZXRzW2ldLmRpcmVjdGlvbiwgdGhpcy5idWxsZXRzW2ldLm5ldElkLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBDb29sZG93biB7XHJcbiAgICAgICAgcHVibGljIGhhc0Nvb2xEb3duOiBib29sZWFuXHJcbiAgICAgICAgcHJpdmF0ZSBjb29sRG93bjogbnVtYmVyOyBnZXQgZ2V0TWF4Q29vbERvd24oKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMuY29vbERvd24gfTsgc2V0IHNldE1heENvb2xEb3duKF9wYXJhbTogbnVtYmVyKSB7IHRoaXMuaGFzQ29vbERvd24gPSBmYWxzZTsgdGhpcy5jb29sRG93biA9IF9wYXJhbTsgdGhpcy5jdXJyZW50Q29vbGRvd24gPSB0aGlzLmNvb2xEb3duOyB9XHJcbiAgICAgICAgcHJpdmF0ZSBjdXJyZW50Q29vbGRvd246IG51bWJlcjsgZ2V0IGdldEN1cnJlbnRDb29sZG93bigpOiBudW1iZXIgeyByZXR1cm4gdGhpcy5jdXJyZW50Q29vbGRvd24gfTtcclxuICAgICAgICBwdWJsaWMgb25FbmRDb29sRG93bjogKCkgPT4gdm9pZDtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfbnVtYmVyOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5jb29sRG93biA9IF9udW1iZXI7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duID0gX251bWJlcjtcclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHN0YXJ0Q29vbERvd24oKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaGFzQ29vbERvd24gPSB0cnVlXHJcbiAgICAgICAgICAgIEdhbWUuxpIuTG9vcC5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuTE9PUF9GUkFNRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGVuZENvb2xEb3duKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vbkVuZENvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vbkVuZENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy5oYXNDb29sRG93biA9IGZhbHNlO1xyXG4gICAgICAgICAgICBHYW1lLsaSLkxvb3AucmVtb3ZlRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULkxPT1BfRlJBTUUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGVDb29sRG93bigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZUNvb2xEb3duKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5oYXNDb29sRG93biAmJiB0aGlzLmN1cnJlbnRDb29sZG93biA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudENvb2xkb3duLS07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudENvb2xkb3duIDw9IDAgJiYgdGhpcy5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lbmRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50Q29vbGRvd24gPSB0aGlzLmNvb2xEb3duO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG4iLCJuYW1lc3BhY2UgQWJpbGl0eSB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQU9FVFlQRSB7XHJcbiAgICAgICAgSEVBTFRIVVBcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQXJlYU9mRWZmZWN0IGV4dGVuZHMgR2FtZS7Gki5Ob2RlIGltcGxlbWVudHMgSW50ZXJmYWNlcy5JTmV0d29ya2FibGUge1xyXG4gICAgICAgIHB1YmxpYyBuZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBpZDogQU9FVFlQRTtcclxuICAgICAgICBwcml2YXRlIHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRQb3NpdGlvbigpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5wb3NpdGlvbiB9OyBzZXQgc2V0UG9zaXRpb24oX3BvczogR2FtZS7Gki5WZWN0b3IyKSB7IHRoaXMucG9zaXRpb24gPSBfcG9zIH07XHJcbiAgICAgICAgcHJpdmF0ZSBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7IGdldCBnZXRDb2xsaWRlcigpOiBDb2xsaWRlci5Db2xsaWRlciB7IHJldHVybiB0aGlzLmNvbGxpZGVyIH07XHJcbiAgICAgICAgcHJpdmF0ZSBkdXJhdGlvbjogQ29vbGRvd247XHJcbiAgICAgICAgcHJpdmF0ZSBhcmVhTWF0OiBHYW1lLsaSLk1hdGVyaWFsO1xyXG4gICAgICAgIHByaXZhdGUgb3duZXJOZXRJZDogbnVtYmVyO1xyXG5cclxuICAgICAgICBwcml2YXRlIGJ1ZmZMaXN0OiBCdWZmLkJ1ZmZbXTsgZ2V0IGdldEJ1ZmZMaXN0KCk6IEJ1ZmYuQnVmZltdIHsgcmV0dXJuIHRoaXMuYnVmZkxpc3QgfTtcclxuICAgICAgICBwcml2YXRlIGRhbWFnZVZhbHVlOiBudW1iZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQU9FVFlQRSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoQU9FVFlQRVtfaWRdLnRvTG93ZXJDYXNlKCkpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLklkTWFuYWdlcihfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5kdXJhdGlvbiA9IG5ldyBDb29sZG93bigxMjApO1xyXG4gICAgICAgICAgICB0aGlzLmR1cmF0aW9uLm9uRW5kQ29vbERvd24gPSB0aGlzLmRlc3Bhd247XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2gobmV3IEdhbWUuxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5kYW1hZ2VWYWx1ZSA9IDE7XHJcbiAgICAgICAgICAgIHRoaXMuYXJlYU1hdCA9IG5ldyDGki5NYXRlcmlhbChcImFvZVNoYWRlclwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgVUkuY29tbW9uUGFydGljbGUpKTtcclxuICAgICAgICAgICAgbGV0IGNtcE1hdCA9IG5ldyBHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKHRoaXMuYXJlYU1hdCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgR2FtZS7Gki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgQ29sbGlkZXIuQ29sbGlkZXIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwuc2NhbGluZyA9IG5ldyBHYW1lLsaSLlZlY3RvcjModGhpcy5jb2xsaWRlci5nZXRSYWRpdXMgKiAyLCB0aGlzLmNvbGxpZGVyLmdldFJhZGl1cyAqIDIsIDEpXHJcbiAgICAgICAgICAgIHRoaXMuYWRkRXZlbnRMaXN0ZW5lcihHYW1lLsaSLkVWRU5ULlJFTkRFUl9QUkVQQVJFLCB0aGlzLmV2ZW50VXBkYXRlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgdXBkYXRlKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaXNpb25EZXRlY3Rpb24oKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcHVibGljIGRlc3Bhd24gPSAoKSA9PiB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiZGVzcGF3blwiKTtcclxuICAgICAgICAgICAgLy9UT0RPOiBmaW5kIHJpZ2h0IHBhcmVudCB0byBjYW5jZWw7XHJcbiAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcbiAgICAgICAgICAgIE5ldHdvcmtpbmcucG9wSUQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3Bhd24oX2VudGl0eTogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBfZW50aXR5LmFkZENoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMSk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRUb0VudGl0eShfZW50aXR5OiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIHRoaXMuc3Bhd24oX2VudGl0eSk7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9lbnRpdHkubmV0SWQ7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiBHYW1lLsaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbnRpdHkuRW50aXR5PmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLkVORU1ZIHx8ICg8RW50aXR5LkVudGl0eT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5QTEFZRVIpO1xyXG4gICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaChfY29sbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gKDxFbnRpdHkuRW50aXR5Pl9jb2xsKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVudGl0eS5jb2xsaWRlcikgJiYgZW50aXR5LmF0dHJpYnV0ZXMgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy9UT0RPOiBvdmVyd3JpdGUgaW4gb3RoZXIgY2hpbGRyZW4gdG8gZG8gb3duIHRoaW5nXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUFyZWFPZkVmZmVjdChlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGFwcGx5QXJlYU9mRWZmZWN0KF9lbnRpdHk6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgLy9UT0RPOiBvdmVyd3JpdGUgaW4gb3RoZXIgY2xhc3Nlc1xyXG4gICAgICAgICAgICBpZiAodGhpcy5vd25lck5ldElkICE9IF9lbnRpdHkubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgIGNvbnNvbGUubG9nKFwiY29sbGlkaW5nIHdpdGg6IFwiICsgX2VudGl0eS5uYW1lKTtcclxuICAgICAgICAgICAgICAgIEJ1ZmYuZ2V0QnVmZkJ5SWQoQnVmZi5CVUZGSUQuUE9JU09OKS5hZGRUb0VudGl0eShfZW50aXR5KTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgRW50aXR5IHtcclxuXHJcbiAgICBleHBvcnQgZW51bSBBVFRSSUJVVEVUWVBFIHtcclxuICAgICAgICBIRUFMVEhQT0lOVFMsXHJcbiAgICAgICAgTUFYSEVBTFRIUE9JTlRTLFxyXG4gICAgICAgIEtOT0NLQkFDS0ZPUkNFLFxyXG4gICAgICAgIEhJVEFCTEUsXHJcbiAgICAgICAgQVJNT1IsXHJcbiAgICAgICAgU1BFRUQsXHJcbiAgICAgICAgQVRUQUNLUE9JTlRTLFxyXG4gICAgICAgIENPT0xET1dOUkVEVUNUSU9OLFxyXG4gICAgICAgIFNDQUxFXHJcbiAgICB9XHJcbiAgICBleHBvcnQgY2xhc3MgQXR0cmlidXRlcyB7XHJcblxyXG4gICAgICAgIGhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIG1heEhlYWx0aFBvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGtub2NrYmFja0ZvcmNlOiBudW1iZXI7XHJcbiAgICAgICAgaGl0YWJsZTogYm9vbGVhbiA9IHRydWU7XHJcbiAgICAgICAgYXJtb3I6IG51bWJlcjtcclxuICAgICAgICBzcGVlZDogbnVtYmVyO1xyXG4gICAgICAgIGF0dGFja1BvaW50czogbnVtYmVyO1xyXG4gICAgICAgIGNvb2xEb3duUmVkdWN0aW9uOiBudW1iZXIgPSAxO1xyXG4gICAgICAgIHNjYWxlOiBudW1iZXI7XHJcbiAgICAgICAgYWNjdXJhY3k6IG51bWJlciA9IDgwO1xyXG5cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2hlYWx0aFBvaW50czogbnVtYmVyLCBfYXR0YWNrUG9pbnRzOiBudW1iZXIsIF9zcGVlZDogbnVtYmVyLCBfc2NhbGU6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9hcm1vcjogbnVtYmVyLCBfY29vbGRvd25SZWR1Y3Rpb246IG51bWJlciwgX2FjY3VyYWN5OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5zY2FsZSA9IF9zY2FsZTtcclxuICAgICAgICAgICAgdGhpcy5hcm1vciA9IF9hcm1vcjtcclxuICAgICAgICAgICAgdGhpcy5oZWFsdGhQb2ludHMgPSBfaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLm1heEhlYWx0aFBvaW50cyA9IHRoaXMuaGVhbHRoUG9pbnRzO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyA9IF9hdHRhY2tQb2ludHM7XHJcbiAgICAgICAgICAgIHRoaXMuc3BlZWQgPSBfc3BlZWQ7XHJcbiAgICAgICAgICAgIHRoaXMua25vY2tiYWNrRm9yY2UgPSBfa25vY2tiYWNrRm9yY2VcclxuICAgICAgICAgICAgdGhpcy5jb29sRG93blJlZHVjdGlvbiA9IF9jb29sZG93blJlZHVjdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5hY2N1cmFjeSA9IF9hY2N1cmFjeTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyB1cGRhdGVTY2FsZURlcGVuZGVuY2llcygpIHtcclxuICAgICAgICAgICAgdGhpcy5tYXhIZWFsdGhQb2ludHMgPSBNYXRoLnJvdW5kKHRoaXMubWF4SGVhbHRoUG9pbnRzICogKDEwMCArICgxMCAqIHRoaXMuc2NhbGUpKSAvIDEwMCk7XHJcbiAgICAgICAgICAgIHRoaXMuaGVhbHRoUG9pbnRzID0gTWF0aC5yb3VuZCh0aGlzLmhlYWx0aFBvaW50cyAqICgxMDAgKyAoMTAgKiB0aGlzLnNjYWxlKSkgLyAxMDApO1xyXG4gICAgICAgICAgICB0aGlzLmF0dGFja1BvaW50cyA9IE1hdGgucm91bmQodGhpcy5hdHRhY2tQb2ludHMgKiB0aGlzLnNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5zcGVlZCA9IE1hdGguZnJvdW5kKHRoaXMuc3BlZWQgLyB0aGlzLnNjYWxlKTtcclxuICAgICAgICAgICAgdGhpcy5rbm9ja2JhY2tGb3JjZSA9IHRoaXMua25vY2tiYWNrRm9yY2UgKiAoMTAwICsgKDEwICogdGhpcy5zY2FsZSkpIC8gMTAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteSB7XHJcbiAgICBleHBvcnQgY2xhc3MgQmlnQm9vbSBleHRlbmRzIEVuZW15RHVtYiB7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLkVORU1ZO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBiZWhhdmlvdXIoKSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkJFSEFWSU9VUi5TVU1NT046XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5TVU1NT04pO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLnNldEFuaW1hdGlvbig8xpJBaWQuU3ByaXRlU2hlZXRBbmltYXRpb24+dGhpcy5hbmltYXRpb25zW1wiaWRsZVwiXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFN1bW1vbm9yIGV4dGVuZHMgRW5lbXlTaG9vdCB7XHJcbiAgICAgICAgZGFtYWdlVGFrZW46IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgIGF0dGFja1BoYXNlQ2Q6IEFiaWxpdHkuQ29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93big1ODApO1xyXG4gICAgICAgIGRlZmVuY2VQaGFzZUNkOiBBYmlsaXR5LkNvb2xkb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oNzIwKTtcclxuICAgICAgICBiZWdpblNob290aW5nOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgc2hvb3RpbmdDb3VudDogbnVtYmVyID0gMztcclxuICAgICAgICBjdXJyZW50U2hvb3RpbmdDb3VudDogbnVtYmVyID0gMDtcclxuICAgICAgICBzdW1tb25Qb3NpdGlvbjogxpIuVmVjdG9yMyA9IG5ldyDGki5WZWN0b3IzKCk7XHJcblxyXG4gICAgICAgIHByaXZhdGUgc3VtbW9uOiBBYmlsaXR5LlNwYXduU3VtbW9uZXJzID0gbmV3IEFiaWxpdHkuU3Bhd25TdW1tb25lcnModGhpcy5uZXRJZCwgMCwgMSwgNDUpO1xyXG4gICAgICAgIHByaXZhdGUgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCA0NSwgMSwgMTMgKiA2MCwgNSk7XHJcbiAgICAgICAgcHJpdmF0ZSBzaG9vdDM2MDogQWJpbGl0eS5jaXJjbGVTaG9vdCA9IG5ldyBBYmlsaXR5LmNpcmNsZVNob290KHRoaXMubmV0SWQsIDAsIDMsIDUgKiA2MCk7XHJcbiAgICAgICAgcHJpdmF0ZSBkYXNoV2VhcG9uOiBXZWFwb25zLldlYXBvbiA9IG5ldyBXZWFwb25zLldlYXBvbigxMiwgMSwgQnVsbGV0cy5CVUxMRVRUWVBFLlNVTU1PTkVSLCAxLCB0aGlzLm5ldElkLCBXZWFwb25zLkFJTS5OT1JNQUwpO1xyXG4gICAgICAgIHByaXZhdGUgZmxvY2s6IEZsb2NraW5nQmVoYXZpb3VyID0gbmV3IEZsb2NraW5nQmVoYXZpb3VyKHRoaXMsIDQsIDQsIDAsIDAsIDEsIDEsIDEsIDIpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogRW50aXR5LklELCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9wb3NpdGlvbiwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLkVORU1ZO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgdGhpcy5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmRlZmVuY2VQaGFzZUNkLm9uRW5kQ29vbERvd24gPSB0aGlzLnN0b3BEZWZlbmNlUGhhc2U7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgYmVoYXZpb3VyKCkge1xyXG4gICAgICAgICAgICB0aGlzLnRhcmdldCA9IEdhbWUuYXZhdGFyMS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlID0gxpIuVmVjdG9yMy5ESUZGRVJFTkNFKENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pLnRvVmVjdG9yMigpLnRvVmVjdG9yMygpLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbikubWFnbml0dWRlO1xyXG4gICAgICAgICAgICB0aGlzLmZsb2NrLnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLmZsb2NrLmdldE1vdmVWZWN0b3IoKS50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgaWYgKGRpc3RhbmNlIDwgNSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pc0FnZ3Jlc3NpdmUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9jay5hdm9pZFdlaWdodCA9IDU7XHJcbiAgICAgICAgICAgICAgICAvL1RPRE86IEludHJvIGFuaW1hdGlvbiBoZXJlIGFuZCB3aGVuIGl0IGlzIGRvbmUgdGhlbiBmaWdodC4uLlxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5mbG9jay5hdm9pZFdlaWdodCA9IDA7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhbWFnZVRha2VuID49IDI1KSB7XHJcbiAgICAgICAgICAgICAgICBuZXcgQnVmZi5BdHRyaWJ1dGVzQnVmZihCdWZmLkJVRkZJRC5JTU1VTkUsIG51bGwsIDEsIDApLmFkZFRvRW50aXR5KHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgLy8gbmV3IEJ1ZmYuRGFtYWdlQnVmZihCdWZmLkJVRkZJRC5QT0lTT04sIDEyMCwgMzAsIDMpLmFkZFRvRW50aXR5KHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50QmVoYXZpb3VyID0gRW50aXR5LkJFSEFWSU9VUi5TVU1NT047XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRCZWhhdmlvdXIgPSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXREYW1hZ2UoX3ZhbHVlOiBudW1iZXIpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3VwZXIuZ2V0RGFtYWdlKF92YWx1ZSk7XHJcbiAgICAgICAgICAgIHRoaXMuZGFtYWdlVGFrZW4gKz0gX3ZhbHVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbW92ZUJlaGF2aW91cigpIHtcclxuICAgICAgICAgICAgdGhpcy5iZWhhdmlvdXIoKTtcclxuXHJcbiAgICAgICAgICAgIHN3aXRjaCAodGhpcy5jdXJyZW50QmVoYXZpb3VyKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuSURMRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLklETEUpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQkVIQVZJT1VSLkZMRUU6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5XQUxLKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmF0dGFja2luZ1BoYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5CRUhBVklPVVIuU1VNTU9OOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZW5jZVBoYXNlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBhdHRhY2tpbmdQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmF0dGFja1BoYXNlQ2QuaGFzQ29vbERvd24pIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYXR0YWNrUGhhc2VDZC5zZXRNYXhDb29sRG93biA9IE1hdGgucm91bmQodGhpcy5hdHRhY2tQaGFzZUNkLmdldE1heENvb2xEb3duICsgTWF0aC5yYW5kb20oKSAqIDUgKyBNYXRoLnJhbmRvbSgpICogLTUpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hdHRhY2tQaGFzZUNkLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5hdHRhY2tQaGFzZUNkLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2UgPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UoQ2FsY3VsYXRpb24uZ2V0Q2xvc2VyQXZhdGFyUG9zaXRpb24odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbikudG9WZWN0b3IyKCkudG9WZWN0b3IzKCksIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlID4gMTAgfHwgdGhpcy5kYXNoLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uID0gQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRCh0aGlzLm1vdmVEaXJlY3Rpb24sIDkwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKSA+PSAxMCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyB0aGlzLm1vdmVEaXJlY3Rpb24gPSB0aGlzLm1vdmVBd2F5KENhbGN1bGF0aW9uLmdldENsb3NlckF2YXRhclBvc2l0aW9uKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKS50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZGFzaC5kb2VzQWJpbGl0eSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGFzaFdlYXBvbi5zaG9vdCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkudG9WZWN0b3IzKCksIG51bGwsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGFzaFdlYXBvbi5nZXRDb29sRG93bi5zZXRNYXhDb29sRG93biA9IENhbGN1bGF0aW9uLmNsYW1wTnVtYmVyKE1hdGgucmFuZG9tKCkgKiAzMCwgOCwgMzApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IChuZXcgxpIuVmVjdG9yMigwLCAwKSkudG9WZWN0b3IzKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNob290aW5nMzYwKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGRlZmVuY2VQaGFzZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgdGhpcy5zdW1tb25Qb3NpdGlvbi5zZXQoR2FtZS5jdXJyZW50Um9vbS5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCBHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLnkgLSAoR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDMpLCB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnopO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMudGVsZXBvcnQoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5TVU1NT04pO1xyXG5cclxuICAgICAgICAgICAgICAgIGlmICghdGhpcy5kZWZlbmNlUGhhc2VDZC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZGVmZW5jZVBoYXNlQ2Quc2V0TWF4Q29vbERvd24gPSBNYXRoLnJvdW5kKHRoaXMuZGVmZW5jZVBoYXNlQ2QuZ2V0TWF4Q29vbERvd24gKyBNYXRoLnJhbmRvbSgpICogNSArIE1hdGgucmFuZG9tKCkgKiAtNSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kZWZlbmNlUGhhc2VDZC5zdGFydENvb2xEb3duKCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyh0aGlzLnN1bW1vblBvc2l0aW9uLCAxKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhcInNwYXduaW5nXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmVEaXJlY3Rpb24gPSDGki5WZWN0b3IzLlpFUk8oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdW1tb24uZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzdG9wRGVmZW5jZVBoYXNlID0gKCkgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLmRhbWFnZVRha2VuID0gMDtcclxuICAgICAgICAgICAgdGhpcy5zdW1tb25Qb3NpdGlvbi5zZXQoR2FtZS5jdXJyZW50Um9vbS5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCBHYW1lLmN1cnJlbnRSb29tLm10eFdvcmxkLnRyYW5zbGF0aW9uLnksIHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueik7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRlbGVwb3J0KCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc2hvb3RpbmczNjAoKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGFtYWdlVGFrZW4gPSAwO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB0ZWxlcG9ydCgpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLmVxdWFscyh0aGlzLnN1bW1vblBvc2l0aW9uKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zd2l0Y2hBbmltYXRpb24oRW50aXR5LkFOSU1BVElPTlNUQVRFUy5URUxFUE9SVCk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZ2V0Q3VycmVudEZyYW1lID49IDUpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gdGhpcy5zdW1tb25Qb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzaG9vdGluZzM2MCgpIHtcclxuICAgICAgICAgICAgaWYgKCF0aGlzLmJlZ2luU2hvb3RpbmcpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQgPSBNYXRoLnJvdW5kKHRoaXMuc2hvb3RpbmdDb3VudCArIE1hdGgucmFuZG9tKCkgKiAyKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IHRydWU7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50U2hvb3RpbmdDb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmJ1bGxldEFtb3VudCA9IE1hdGgucm91bmQoOCArIE1hdGgucmFuZG9tKCkgKiA4KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnNob290MzYwLmRvQWJpbGl0eSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnNob290MzYwLmRvZXNBYmlsaXR5KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudFNob290aW5nQ291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYmVnaW5TaG9vdGluZyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEJ1ZmYge1xyXG5cclxuICAgIGV4cG9ydCBlbnVtIEJVRkZJRCB7XHJcbiAgICAgICAgQkxFRURJTkcsXHJcbiAgICAgICAgUE9JU09OLFxyXG4gICAgICAgIEhFQUwsXHJcbiAgICAgICAgU0xPVyxcclxuICAgICAgICBJTU1VTkUsXHJcbiAgICAgICAgU0NBTEVVUCxcclxuICAgICAgICBTQ0FMRURPV05cclxuICAgIH1cclxuICAgIGV4cG9ydCBhYnN0cmFjdCBjbGFzcyBCdWZmIHtcclxuICAgICAgICBkdXJhdGlvbjogbnVtYmVyO1xyXG4gICAgICAgIHRpY2tSYXRlOiBudW1iZXJcclxuICAgICAgICBpZDogQlVGRklEO1xyXG4gICAgICAgIHByb3RlY3RlZCBub0R1cmF0aW9uOiBudW1iZXI7XHJcbiAgICAgICAgcHJvdGVjdGVkIGNvb2xEb3duOiBBYmlsaXR5LkNvb2xkb3duO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaWQgPSBfaWQ7XHJcbiAgICAgICAgICAgIHRoaXMuZHVyYXRpb24gPSBfZHVyYXRpb247XHJcbiAgICAgICAgICAgIHRoaXMudGlja1JhdGUgPSBfdGlja1JhdGU7XHJcbiAgICAgICAgICAgIHRoaXMubm9EdXJhdGlvbiA9IDA7XHJcbiAgICAgICAgICAgIGlmIChfZHVyYXRpb24gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNvb2xEb3duID0gbmV3IEFiaWxpdHkuQ29vbGRvd24oX2R1cmF0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24gPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBnZXRQYXJ0aWNsZUJ5SWQoX2lkOiBCVUZGSUQpOiBVSS5QYXJ0aWNsZXMge1xyXG4gICAgICAgICAgICBzd2l0Y2ggKF9pZCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuUE9JU09OOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKEJVRkZJRC5QT0lTT04sIFVJLnBvaXNvblBhcnRpY2xlLCA2LCAxMik7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5JTU1VTkU6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoQlVGRklELklNTVVORSwgVUkuaW1tdW5lUGFydGljbGUsIDEsIDYpO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNsb25lKCk6IEJ1ZmYge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcztcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhcHBseUJ1ZmYoX2F2YXRhcjogRW50aXR5LkVudGl0eSkge1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmdldEJ1ZmZTdGF0c0J5SWQodGhpcy5pZCwgX2F2YXRhciwgdHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1ZmZMaXN0KF9hdmF0YXIuYnVmZnMsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIHJlbW92ZXMgdGhlIGJ1ZmYgZnJvbSB0aGUgYnVmZiBsaXN0LCByZW1vdmVzIHRoZSBwYXJ0aWNsZSBhbmQgc2VuZHMgdGhlIG5ldyBsaXN0IHRvIHRoZSBjbGllbnRcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgdGhlIGJ1ZmYgc2hvdWxkIGJlIHJlbW92ZWRcclxuICAgICAgICAgKi9cclxuICAgICAgICBwdWJsaWMgcmVtb3ZlQnVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIF9hdmF0YXIucmVtb3ZlQ2hpbGQoX2F2YXRhci5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpKTtcclxuICAgICAgICAgICAgX2F2YXRhci5idWZmcy5zcGxpY2UoX2F2YXRhci5idWZmcy5pbmRleE9mKHRoaXMpKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRCdWZmU3RhdHNCeUlkKHRoaXMuaWQsIF9hdmF0YXIsIGZhbHNlKTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQnVmZkxpc3QoX2F2YXRhci5idWZmcywgX2F2YXRhci5uZXRJZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogb25seSB1c2UgdGhpcyBmdW5jdGlvbiB0byBhZGQgYnVmZnMgdG8gZW50aXRpZXNcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqIEByZXR1cm5zIFxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBhZGRUb0VudGl0eShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmJ1ZmZzLmZpbHRlcihidWZmID0+IGJ1ZmYuaWQgPT0gdGhpcy5pZCkubGVuZ3RoID4gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2F2YXRhci5idWZmcy5wdXNoKHRoaXMpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY29vbERvd24uc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVCdWZmTGlzdChfYXZhdGFyLmJ1ZmZzLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLyoqXHJcbiAgICAgICAgICogYnVmZiBhcHBsaWVzIGl0cyBidWZmIHN0YXRzIHRvIHRoZSBlbnRpdHkgYW5kIGRlbGV0ZXMgaXRzZWxmIHdoZW4gaXRzIGR1cmF0aW9uIGlzIG92ZXJcclxuICAgICAgICAgKiBAcGFyYW0gX2F2YXRhciBlbnRpdHkgaXQgc2hvdWxkIGJlIGFkZCB0b1xyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcblxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCdWZmLkJVRkZJRCwgX2F2YXRhcjogRW50aXR5LkVudGl0eSwgX2FkZDogYm9vbGVhbikge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBhZGRQYXJ0aWNsZShfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmIChfYXZhdGFyLmdldENoaWxkcmVuKCkuZmluZChjaGlsZCA9PiAoPFVJLlBhcnRpY2xlcz5jaGlsZCkuaWQgPT0gdGhpcy5pZCkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgcGFydGljbGUgPSB0aGlzLmdldFBhcnRpY2xlQnlJZCh0aGlzLmlkKTtcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmFkZENoaWxkKHBhcnRpY2xlKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC5zY2FsZShuZXcgxpIuVmVjdG9yMyhfYXZhdGFyLm10eExvY2FsLnNjYWxpbmcueCwgX2F2YXRhci5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IyKF9hdmF0YXIub2Zmc2V0Q29sbGlkZXJYLCBfYXZhdGFyLm9mZnNldENvbGxpZGVyWSkudG9WZWN0b3IzKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFJhcml0eUJ1ZmYge1xyXG4gICAgICAgIGlkOiBJdGVtcy5SQVJJVFk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBJdGVtcy5SQVJJVFkpIHtcclxuICAgICAgICAgICAgdGhpcy5pZCA9IF9pZDtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBhZGRUb0l0ZW0oX2l0ZW06IEl0ZW1zLkl0ZW0pIHtcclxuICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZVRvSXRlbShfaXRlbSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGdldFBhcnRpY2xlQnlJZChfaWQ6IEl0ZW1zLlJBUklUWSk6IFVJLlBhcnRpY2xlcyB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEl0ZW1zLlJBUklUWS5DT01NT046XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuUkFSRTpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLnJhcmVQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuRVBJQzpcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IFVJLlBhcnRpY2xlcyhfaWQsIFVJLmVwaWNQYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBJdGVtcy5SQVJJVFkuTEVHRU5EQVJZOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBuZXcgVUkuUGFydGljbGVzKF9pZCwgVUkubGVnZW5kYXJ5UGFydGljbGUsIDEsIDEyKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBVSS5QYXJ0aWNsZXMoX2lkLCBVSS5jb21tb25QYXJ0aWNsZSwgMSwgMTIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIGFkZFBhcnRpY2xlVG9JdGVtKF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIGlmIChfaXRlbS5nZXRDaGlsZHJlbigpLmZpbmQoY2hpbGQgPT4gKDxVSS5QYXJ0aWNsZXM+Y2hpbGQpLmlkID09IHRoaXMuaWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHBhcnRpY2xlID0gdGhpcy5nZXRQYXJ0aWNsZUJ5SWQodGhpcy5pZClcclxuICAgICAgICAgICAgICAgIGlmIChwYXJ0aWNsZSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBfaXRlbS5hZGRDaGlsZChwYXJ0aWNsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUubXR4TG9jYWwuc2NhbGUobmV3IMaSLlZlY3RvcjMoX2l0ZW0ubXR4TG9jYWwuc2NhbGluZy54LCBfaXRlbS5tdHhMb2NhbC5zY2FsaW5nLnksIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXJ0aWNsZS5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcGFydGljbGUuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGNyZWF0ZXMgYSBuZXcgQnVmZiB0aGF0IGRvZXMgRGFtYWdlIHRvIGFuIEVudGl0eTtcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIERhbWFnZUJ1ZmYgZXh0ZW5kcyBCdWZmIHtcclxuICAgICAgICB2YWx1ZTogbnVtYmVyO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogQlVGRklELCBfZHVyYXRpb246IG51bWJlciwgX3RpY2tSYXRlOiBudW1iZXIsIF92YWx1ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX2R1cmF0aW9uLCBfdGlja1JhdGUpXHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvbmUoKTogRGFtYWdlQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRGFtYWdlQnVmZih0aGlzLmlkLCB0aGlzLmR1cmF0aW9uLCB0aGlzLnRpY2tSYXRlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNvb2xEb3duICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmNvb2xEb3duLmhhc0Nvb2xEb3duKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVCdWZmKF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKHRoaXMuY29vbERvd24uZ2V0Q3VycmVudENvb2xkb3duICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5ub0R1cmF0aW9uICUgdGhpcy50aWNrUmF0ZSA9PSAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hcHBseUJ1ZmYoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vRHVyYXRpb24rKztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2lkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuQkxFRURJTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5QT0lTT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIG9ubHkgZG8gZGFtYWdlIHRvIHBsYXllciB1bnRpbCBoZSBoYXMgMjAlIGhlYWx0aFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoX2F2YXRhciBpbnN0YW5jZW9mIFBsYXllci5QbGF5ZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChfYXZhdGFyLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzID4gX2F2YXRhci5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyAqIDAuMikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuZ2V0RGFtYWdlKHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5nZXREYW1hZ2UodGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7IHJldHVybjsgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogY3JlYXRlcyBhIG5ldyBCdWZmIHRoYXQgY2hhbmdlcyBhbiBhdHRyaWJ1dGUgb2YgYW4gRW50aXR5IGZvciB0aGUgZHVyYXRpb24gb2YgdGhlIGJ1ZmZcclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGNsYXNzIEF0dHJpYnV0ZXNCdWZmIGV4dGVuZHMgQnVmZiB7XHJcbiAgICAgICAgcHJpdmF0ZSBpc0J1ZmZBcHBsaWVkOiBib29sZWFuO1xyXG4gICAgICAgIHZhbHVlOiBudW1iZXI7XHJcbiAgICAgICAgcHJpdmF0ZSByZW1vdmVkVmFsdWU6IG51bWJlcjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfaWQ6IEJVRkZJRCwgX2R1cmF0aW9uOiBudW1iZXIsIF90aWNrUmF0ZTogbnVtYmVyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9kdXJhdGlvbiwgX3RpY2tSYXRlKTtcclxuICAgICAgICAgICAgdGhpcy5pc0J1ZmZBcHBsaWVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIHRoaXMudmFsdWUgPSBfdmFsdWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBjbG9uZSgpOiBBdHRyaWJ1dGVzQnVmZiB7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgQXR0cmlidXRlc0J1ZmYodGhpcy5pZCwgdGhpcy5kdXJhdGlvbiwgdGhpcy50aWNrUmF0ZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBkb0J1ZmZTdHVmZihfYXZhdGFyOiBFbnRpdHkuRW50aXR5KSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmR1cmF0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuZHVyYXRpb24gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlQnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2UgaWYgKCF0aGlzLmlzQnVmZkFwcGxpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5kdXJhdGlvbi0tO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKCF0aGlzLmlzQnVmZkFwcGxpZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFwcGx5QnVmZihfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmlzQnVmZkFwcGxpZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRQYXJ0aWNsZShfYXZhdGFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIGdldEJ1ZmZTdGF0c0J5SWQoX2lkOiBCVUZGSUQsIF9hdmF0YXI6IEVudGl0eS5FbnRpdHksIF9hZGQ6IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgbGV0IHBheWxvYWQ6IEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZDtcclxuICAgICAgICAgICAgc3dpdGNoIChfaWQpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNMT1c6XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF9hZGQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5yZW1vdmVkVmFsdWUgPSBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgLSBDYWxjdWxhdGlvbi5zdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQsIHRoaXMudmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgLT0gQ2FsY3VsYXRpb24uc3ViUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNwZWVkLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc3BlZWQgKz0gdGhpcy5yZW1vdmVkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBCVUZGSUQuSU1NVU5FOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5oaXRhYmxlID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLmhpdGFibGUgPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkID0gPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuaGl0YWJsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRSB9XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEJVRkZJRC5TQ0FMRVVQOlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChfYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucmVtb3ZlZFZhbHVlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKSAtIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlID0gQ2FsY3VsYXRpb24uYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2F2YXRhci5hdHRyaWJ1dGVzLnNjYWxlLCB0aGlzLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtPSB0aGlzLnJlbW92ZWRWYWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgX2F2YXRhci51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIHBheWxvYWQgPSA8SW50ZXJmYWNlcy5JQXR0cmlidXRlVmFsdWVQYXlsb2FkPnsgdmFsdWU6IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdHlwZTogRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEUgfTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgQlVGRklELlNDQUxFRE9XTjpcclxuICAgICAgICAgICAgICAgICAgICBpZiAoX2FkZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnJlbW92ZWRWYWx1ZSA9IF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSAtIENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSA9IENhbGN1bGF0aW9uLnN1YlBlcmNlbnRhZ2VBbW91bnRUb1ZhbHVlKF9hdmF0YXIuYXR0cmlidXRlcy5zY2FsZSwgdGhpcy52YWx1ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUgKz0gdGhpcy5yZW1vdmVkVmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIF9hdmF0YXIudXBkYXRlU2NhbGUoKTtcclxuICAgICAgICAgICAgICAgICAgICBwYXlsb2FkID0gPEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZD57IHZhbHVlOiBfYXZhdGFyLmF0dHJpYnV0ZXMuc2NhbGUsIHR5cGU6IEVudGl0eS5BVFRSSUJVVEVUWVBFLlNDQUxFIH07XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVFbnRpdHlBdHRyaWJ1dGVzKHBheWxvYWQsIF9hdmF0YXIubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0QnVmZkJ5SWQoX2lkOiBCVUZGSUQpOiBCdWZmIHtcclxuICAgICAgICBsZXQgcmVmOiBCdWZmID0gdW5kZWZpbmVkO1xyXG5cclxuICAgICAgICByZWYgPSA8RGFtYWdlQnVmZj5HYW1lLmRhbWFnZUJ1ZmZKU09OLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IF9pZCk7XHJcbiAgICAgICAgaWYgKHJlZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBEYW1hZ2VCdWZmKF9pZCwgcmVmLmR1cmF0aW9uLCByZWYudGlja1JhdGUsICg8RGFtYWdlQnVmZj5yZWYpLnZhbHVlKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHJlZiA9IDxBdHRyaWJ1dGVzQnVmZj5HYW1lLmF0dHJpYnV0ZUJ1ZmZKU09OLmZpbmQoYnVmZiA9PiBidWZmLmlkID09IF9pZCk7XHJcbiAgICAgICAgaWYgKHJlZiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBBdHRyaWJ1dGVzQnVmZihfaWQsIHJlZi5kdXJhdGlvbiwgcmVmLnRpY2tSYXRlLCAoPEF0dHJpYnV0ZXNCdWZmPnJlZikudmFsdWUpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQnVsbGV0cyB7XHJcblxyXG4gICAgZXhwb3J0IGVudW0gQlVMTEVUVFlQRSB7XHJcbiAgICAgICAgU1RBTkRBUkQsXHJcbiAgICAgICAgSElHSFNQRUVELFxyXG4gICAgICAgIFNMT1csXHJcbiAgICAgICAgTUVMRUUsXHJcbiAgICAgICAgU1VNTU9ORVIsXHJcbiAgICAgICAgVEhPUlNIQU1NRVIsXHJcbiAgICAgICAgWklQWkFQXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGxldCBidWxsZXRUeHQ6IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBsZXQgd2F0ZXJCYWxsVHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBCdWxsZXQgZXh0ZW5kcyBHYW1lLsaSLk5vZGUgaW1wbGVtZW50cyBJbnRlcmZhY2VzLklTcGF3bmFibGUsIEludGVyZmFjZXMuSU5ldHdvcmthYmxlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5CVUxMRVQ7XHJcbiAgICAgICAgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwdWJsaWMgbmV0SWQ6IG51bWJlcjtcclxuICAgICAgICBwdWJsaWMgY2xpZW50UHJlZGljdGlvbjogTmV0d29ya2luZy5DbGllbnRCdWxsZXRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHB1YmxpYyBzZXJ2ZXJQcmVkaWN0aW9uOiBOZXR3b3JraW5nLlNlcnZlckJ1bGxldFByZWRpY3Rpb247XHJcbiAgICAgICAgcHVibGljIGZseURpcmVjdGlvbjogxpIuVmVjdG9yMztcclxuICAgICAgICBkaXJlY3Rpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIHB1YmxpYyBoaXRQb2ludHNTY2FsZTogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBzcGVlZDogbnVtYmVyID0gMjA7XHJcbiAgICAgICAgbGlmZXRpbWU6IG51bWJlciA9IDEgKiA2MDtcclxuICAgICAgICBrbm9ja2JhY2tGb3JjZTogbnVtYmVyID0gNDtcclxuICAgICAgICB0eXBlOiBCVUxMRVRUWVBFO1xyXG5cclxuICAgICAgICB0aW1lOiBudW1iZXIgPSAwO1xyXG4gICAgICAgIGtpbGxjb3VudDogbnVtYmVyID0gMTtcclxuXHJcbiAgICAgICAgdGV4dHVyZVBhdGg6IHN0cmluZztcclxuXHJcbiAgICAgICAgcHVibGljIGRlc3Bhd24oKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmxpZmV0aW1lID49IDAgJiYgdGhpcy5saWZldGltZSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmxpZmV0aW1lLS07XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5saWZldGltZSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnBvcElEKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcucmVtb3ZlQnVsbGV0KHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGgucmVtb3ZlQ2hpbGQodGhpcyk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLnR5cGUgPT0gQlVMTEVUVFlQRS5USE9SU0hBTU1FUikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNwYXduVGhvcnNIYW1tZXIoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9idWxsZXRUeXBlOiBCVUxMRVRUWVBFLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9vd25lck5ldElkOiBudW1iZXIsIF9uZXRJZD86IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCVUxMRVRUWVBFW19idWxsZXRUeXBlXSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnR5cGUgPSBfYnVsbGV0VHlwZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubmV0SWQgPSBOZXR3b3JraW5nLklkTWFuYWdlcihfbmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgbGV0IHJlZiA9IEdhbWUuYnVsbGV0c0pTT04uZmluZChidWxsZXQgPT4gYnVsbGV0Lm5hbWUgPT0gQlVMTEVUVFlQRVtfYnVsbGV0VHlwZV0udG9Mb3dlckNhc2UoKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gcmVmLnNwZWVkO1xyXG4gICAgICAgICAgICB0aGlzLmhpdFBvaW50c1NjYWxlID0gcmVmLmhpdFBvaW50c1NjYWxlO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gcmVmLmxpZmV0aW1lO1xyXG4gICAgICAgICAgICB0aGlzLmtub2NrYmFja0ZvcmNlID0gcmVmLmtub2NrYmFja0ZvcmNlO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IHJlZi5raWxsY291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMudGV4dHVyZVBhdGggPSByZWYudGV4dHVyZVBhdGg7XHJcblxyXG4gICAgICAgICAgICAvLyB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TGlnaHQobmV3IMaSLkxpZ2h0UG9pbnQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIikpKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoX3Bvc2l0aW9uLngsIF9wb3NpdGlvbi55LCAwKTtcclxuICAgICAgICAgICAgbGV0IG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkKCk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2gobWVzaCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1lc2gpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG10clNvbGlkV2hpdGU6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwiU29saWRXaGl0ZVwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgICAgICBsZXQgY21wTWF0ZXJpYWw6IMaSLkNvbXBvbmVudE1hdGVyaWFsID0gbmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG10clNvbGlkV2hpdGUpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJQb3NpdGlvbiA9IG5ldyDGki5WZWN0b3IyKHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnggKyB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnggLyAyLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcihjb2xsaWRlclBvc2l0aW9uLCB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC5zY2FsaW5nLnkgLyAxLjUsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZVJvdGF0aW9uKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB0aGlzLmxvYWRUZXh0dXJlKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZmx5RGlyZWN0aW9uID0gxpIuVmVjdG9yMy5YKCk7XHJcbiAgICAgICAgICAgIHRoaXMuZGlyZWN0aW9uID0gX2RpcmVjdGlvbjtcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX293bmVyTmV0SWQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNlcnZlclByZWRpY3Rpb24gPSBuZXcgTmV0d29ya2luZy5TZXJ2ZXJCdWxsZXRQcmVkaWN0aW9uKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmNsaWVudFByZWRpY3Rpb24gPSBuZXcgTmV0d29ya2luZy5DbGllbnRCdWxsZXRQcmVkaWN0aW9uKHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMucHJlZGljdCgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHByZWRpY3QoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gTmV0d29ya2luZy5jbGllbnQuaWQgJiYgdGhpcy5vd25lciA9PSBHYW1lLmF2YXRhcjEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50UHJlZGljdGlvbi51cGRhdGUoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMikge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuc2VydmVyUHJlZGljdGlvbi51cGRhdGUoKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5tb3ZlKHRoaXMuZmx5RGlyZWN0aW9uLmNsb25lKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm10eExvY2FsLnJvdGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjdGlvbi5ub3JtYWxpemUoKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCAmJiB0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMikge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSh0aGlzLmNsaWVudFByZWRpY3Rpb24ubWluVGltZUJldHdlZW5UaWNrcyAqIHRoaXMuc3BlZWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZShHYW1lLmRlbHRhVGltZSAqIHRoaXMuc3BlZWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgdGhpcy5vZmZzZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZVJvdGF0aW9uKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKENhbGN1bGF0aW9uLmNhbGNEZWdyZWUodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIMaSLlZlY3RvcjMuU1VNKF9kaXJlY3Rpb24sIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKSkgKyA5MCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgc3Bhd25UaG9yc0hhbW1lcigpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHJlbW92ZUl0ZW0gPSB0aGlzLm93bmVyLml0ZW1zLmZpbmQoaXRlbSA9PiAoPEl0ZW1zLkludGVybmFsSXRlbT5pdGVtKS5pZCA9PSBJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIHJlbW92ZUl0ZW0uaWQsIHJlbW92ZUl0ZW0ubmV0SWQsIHRoaXMub3duZXJOZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLml0ZW1zLnNwbGljZSh0aGlzLm93bmVyLml0ZW1zLmluZGV4T2YocmVtb3ZlSXRlbSksIDEpO1xyXG5cclxuICAgICAgICAgICAgICAgIGxldCBpdGVtID0gbmV3IEl0ZW1zLkludGVybmFsSXRlbShJdGVtcy5JVEVNSUQuVEhPUlNIQU1NRVIpO1xyXG4gICAgICAgICAgICAgICAgaXRlbS5zZXRQb3NpdGlvbih0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0Q2hvb3Nlbk9uZU5ldElkKEdhbWUuYXZhdGFyMi5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0Q2hvb3Nlbk9uZU5ldElkKEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBpdGVtLnNwYXduKCk7XHJcblxyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24uZ2V0Q29vbERvd24uc2V0TWF4Q29vbERvd24gPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJjb29sZG93blRpbWVcIik7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5haW1UeXBlID0gKDxhbnk+V2VhcG9ucy5BSU0pW2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiYWltVHlwZVwiKV07XHJcbiAgICAgICAgICAgICAgICB0aGlzLm93bmVyLndlYXBvbi5idWxsZXRUeXBlID0gKDxhbnk+QlVMTEVUVFlQRSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJidWxsZXRUeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgIHRoaXMub3duZXIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0aWxlQW1vdW50XCIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vd25lci53ZWFwb24uY2FuU2hvb3QgPSBmYWxzZTtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKHRoaXMub3duZXIud2VhcG9uLCB0aGlzLm93bmVyTmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcm90ZWN0ZWQgbG9hZFRleHR1cmUoKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRleHR1cmVQYXRoICE9IFwiXCIgfHwgdGhpcy50ZXh0dXJlUGF0aCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3VHh0OiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV3Q29hdDogxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkID0gbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCgpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5ld010cjogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJtdHJcIiwgxpIuU2hhZGVyRmxhdFRleHR1cmVkLCBuZXdDb2F0KTtcclxuXHJcbiAgICAgICAgICAgICAgICBsZXQgb2xkQ29tQ29hdDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgICAgICAgICBvbGRDb21Db2F0ID0gdGhpcy5nZXRDb21wb25lbnQoxpIuQ29tcG9uZW50TWF0ZXJpYWwpO1xyXG5cclxuICAgICAgICAgICAgICAgIHN3aXRjaCAodGhpcy50ZXh0dXJlUGF0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgYnVsbGV0VHh0LnVybDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV3VHh0ID0gYnVsbGV0VHh0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIHdhdGVyQmFsbFR4dC51cmw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1R4dCA9IHdhdGVyQmFsbFR4dDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC5jb2xvciA9IMaSLkNvbG9yLkNTUyhcIldISVRFXCIpO1xyXG4gICAgICAgICAgICAgICAgbmV3Q29hdC50ZXh0dXJlID0gbmV3VHh0O1xyXG4gICAgICAgICAgICAgICAgb2xkQ29tQ29hdC5tYXRlcmlhbCA9IG5ld010cjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgc2V0QnVmZlRvVGFyZ2V0KF90YXJnZXQ6IEVudGl0eS5FbnRpdHkpIHtcclxuICAgICAgICAgICAgdGhpcy5vd25lci5pdGVtcy5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaXRlbS5idWZmLmZvckVhY2goYnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGJ1ZmYgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGJ1ZmYuY2xvbmUoKS5hZGRUb0VudGl0eShfdGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9KVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBvZmZzZXRDb2xsaWRlcigpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIodGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24ueCArIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLnkpO1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gbmV3UG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY29sbGlzaW9uRGV0ZWN0aW9uKCkge1xyXG4gICAgICAgICAgICBsZXQgY29sbGlkZXJzOiDGki5Ob2RlW10gPSBbXTtcclxuICAgICAgICAgICAgaWYgKHRoaXMub3duZXIudGFnID09IFRhZy5UQUcuUExBWUVSKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxFbmVteS5FbmVteT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5FTkVNWSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY29sbGlkZXJzLmZvckVhY2goKF9lbGVtKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogRW5lbXkuRW5lbXkgPSAoPEVuZW15LkVuZW15Pl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLmNvbGxpZGVyLmNvbGxpZGVzKGVsZW1lbnQuY29sbGlkZXIpICYmIGVsZW1lbnQuYXR0cmlidXRlcyAhPSB1bmRlZmluZWQgJiYgdGhpcy5raWxsY291bnQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbGVtZW50IGluc3RhbmNlb2YgRW5lbXkuU3VtbW9ub3JBZGRzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxFbmVteS5TdW1tb25vckFkZHM+ZWxlbWVudCkuYXZhdGFyID09IHRoaXMub3duZXIpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzICogdGhpcy5oaXRQb2ludHNTY2FsZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuc2V0QnVmZlRvVGFyZ2V0KCg8RW5lbXkuRW5lbXk+ZWxlbWVudCkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEVuZW15LkVuZW15PmVsZW1lbnQpLmdldEtub2NrYmFjayh0aGlzLmtub2NrYmFja0ZvcmNlLCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5raWxsY291bnQtLTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLnRhZyA9PSBUYWcuVEFHLkVORU1ZKSB7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMgPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW1lbnQgPT4gKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLnRhZyA9PSBUYWcuVEFHLlBMQVlFUik7XHJcbiAgICAgICAgICAgICAgICBjb2xsaWRlcnMuZm9yRWFjaCgoX2VsZW0pID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZWxlbWVudDogUGxheWVyLlBsYXllciA9ICg8UGxheWVyLlBsYXllcj5fZWxlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoZWxlbWVudC5jb2xsaWRlcikgJiYgZWxlbWVudC5hdHRyaWJ1dGVzICE9IHVuZGVmaW5lZCAmJiB0aGlzLmtpbGxjb3VudCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5hdHRyaWJ1dGVzLmhlYWx0aFBvaW50cyA+IDAgJiYgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmF0dHJpYnV0ZXMuaGl0YWJsZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPmVsZW1lbnQpLmdldERhbWFnZSh0aGlzLmhpdFBvaW50c1NjYWxlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8UGxheWVyLlBsYXllcj5lbGVtZW50KS5nZXRLbm9ja2JhY2sodGhpcy5rbm9ja2JhY2tGb3JjZSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSSgoPFBsYXllci5QbGF5ZXI+ZWxlbWVudCkuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLmhpdFBvaW50c1NjYWxlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMua2lsbGNvdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2xsaWRlcnMgPSBbXTtcclxuICAgICAgICAgICAgY29sbGlkZXJzID0gKDxHZW5lcmF0aW9uLlJvb20+R2FtZS5ncmFwaC5nZXRDaGlsZHJlbigpLmZpbmQoZWxlbWVudCA9PiAoPEdlbmVyYXRpb24uUm9vbT5lbGVtZW50KS50YWcgPT0gVGFnLlRBRy5ST09NKSkud2FsbHM7XHJcbiAgICAgICAgICAgIGNvbGxpZGVycy5mb3JFYWNoKChfZWxlbSkgPT4ge1xyXG4gICAgICAgICAgICAgICAgbGV0IGVsZW1lbnQ6IEdlbmVyYXRpb24uV2FsbCA9ICg8R2VuZXJhdGlvbi5XYWxsPl9lbGVtKTtcclxuICAgICAgICAgICAgICAgIGlmIChlbGVtZW50LmNvbGxpZGVyICE9IHVuZGVmaW5lZCAmJiB0aGlzLmNvbGxpZGVyLmNvbGxpZGVzUmVjdChlbGVtZW50LmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGlmZXRpbWUgPSAwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgSG9taW5nQnVsbGV0IGV4dGVuZHMgQnVsbGV0IHtcclxuICAgICAgICB0YXJnZXQ6IMaSLlZlY3RvcjM7XHJcbiAgICAgICAgcm90YXRlU3BlZWQ6IG51bWJlciA9IDI7XHJcbiAgICAgICAgdGFyZ2V0RGlyZWN0aW9uOiDGki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfYnVsbGV0dHlwZTogQlVMTEVUVFlQRSwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfZGlyZWN0aW9uOiDGki5WZWN0b3IzLCBfb3duZXJJZDogbnVtYmVyLCBfdGFyZ2V0PzogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9idWxsZXR0eXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIF9vd25lcklkLCBfbmV0SWQpO1xyXG4gICAgICAgICAgICB0aGlzLnNwZWVkID0gMjA7XHJcbiAgICAgICAgICAgIHRoaXMuaGl0UG9pbnRzU2NhbGUgPSAxO1xyXG4gICAgICAgICAgICB0aGlzLmxpZmV0aW1lID0gMSAqIDYwO1xyXG4gICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDE7XHJcbiAgICAgICAgICAgIGlmIChfdGFyZ2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gX3RhcmdldDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAgICAgLy8gICAgIHRoaXMudGFyZ2V0ID0gxpIuVmVjdG9yMy5TVU0odGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiwgX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIC8vIH1cclxuICAgICAgICAgICAgdGhpcy50YXJnZXREaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnNldFRhcmdldChHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgc3VwZXIubW92ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jYWxjdWxhdGVIb21pbmcoKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2FsY3VsYXRlSG9taW5nKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldFRhcmdldChfbmV0SUQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBpZiAoR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMudGFyZ2V0ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gX25ldElEKS5tdHhMb2NhbC50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjYWxjdWxhdGVIb21pbmcoKSB7XHJcbiAgICAgICAgICAgIGxldCBuZXdEaXJlY3Rpb24gPSDGki5WZWN0b3IzLkRJRkZFUkVOQ0UodGhpcy50YXJnZXQsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICBpZiAobmV3RGlyZWN0aW9uLnggIT0gMCAmJiBuZXdEaXJlY3Rpb24ueSAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdEaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgbGV0IHJvdGF0ZUFtb3VudDI6IG51bWJlciA9IMaSLlZlY3RvcjMuQ1JPU1MobmV3RGlyZWN0aW9uLCB0aGlzLm10eExvY2FsLmdldFgoKSkuejtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5yb3RhdGVaKC1yb3RhdGVBbW91bnQyICogdGhpcy5yb3RhdGVTcGVlZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBaaXBaYXBPYmplY3QgZXh0ZW5kcyBCdWxsZXQge1xyXG4gICAgICAgIHByaXZhdGUgbmV4dFRhcmdldDogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHByaXZhdGUgYXZhdGFyczogUGxheWVyLlBsYXllcltdO1xyXG4gICAgICAgIHByaXZhdGUgcGxheWVyU2l6ZTogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgY291bnRlcjogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgdGlja0hpdDogQWJpbGl0eS5Db29sZG93bjtcclxuICAgICAgICBjb25zdHJ1Y3Rvcihfb3duZXJOZXRJZDogbnVtYmVyLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihCVUxMRVRUWVBFLlpJUFpBUCwgbmV3IMaSLlZlY3RvcjIoMCwgMCksIG5ldyDGki5WZWN0b3IyKDAsIDApLnRvVmVjdG9yMygpLCBfb3duZXJOZXRJZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gdW5kZWZpbmVkO1xyXG4gICAgICAgICAgICB0aGlzLmNvdW50ZXIgPSAwO1xyXG4gICAgICAgICAgICB0aGlzLnRhZyA9IFRhZy5UQUcuVUk7XHJcbiAgICAgICAgICAgIHRoaXMudGlja0hpdCA9IG5ldyBBYmlsaXR5LkNvb2xkb3duKDEyKTtcclxuICAgICAgICAgICAgdGhpcy5jb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCB0aGlzLm10eExvY2FsLnNjYWxpbmcueCAvIDIsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgZXZlbnRVcGRhdGUgPSAoX2V2ZW50OiBFdmVudCk6IHZvaWQgPT4ge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSgpO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIHVwZGF0ZSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKEdhbWUuYXZhdGFyMSAhPSB1bmRlZmluZWQgJiYgR2FtZS5hdmF0YXIyICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmF2YXRhcnMgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuYXZhdGFycyA9IFtHYW1lLmF2YXRhcjEsIEdhbWUuYXZhdGFyMl07XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMucGxheWVyU2l6ZSA9IHRoaXMuYXZhdGFycy5sZW5ndGg7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMubmV4dFRhcmdldCA9IHRoaXMuYXZhdGFyc1swICUgdGhpcy5wbGF5ZXJTaXplXS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IHRoaXMubmV4dFRhcmdldC50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5hdmF0YXJzID0gW0dhbWUuYXZhdGFyMSwgR2FtZS5hdmF0YXIyXTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLm1vdmUoKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpZGVyLnBvc2l0aW9uID0gdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoIXRoaXMudGlja0hpdC5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbGxpc2lvbkRldGVjdGlvbigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnRpY2tIaXQuc3RhcnRDb29sRG93bigpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUJ1bGxldCh0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLCB0aGlzLm10eExvY2FsLnJvdGF0aW9uLCB0aGlzLm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmtpbGxjb3VudCA9IDUwO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHVibGljIHNwYXduKCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKHRoaXMpO1xyXG4gICAgICAgICAgICBOZXR3b3JraW5nLnNwYXduWmlwWmFwKHRoaXMub3duZXJOZXRJZCwgdGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZGVzcGF3bigpIHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZCh0aGlzKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5yZW1vdmVCdWxsZXQodGhpcy5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZSgpIHtcclxuICAgICAgICAgICAgbGV0IGRpcmVjdGlvbiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubmV4dFRhcmdldCwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZSA9IGRpcmVjdGlvbi5tYWduaXR1ZGVTcXVhcmVkO1xyXG4gICAgICAgICAgICBpZiAoZGlyZWN0aW9uLm1hZ25pdHVkZVNxdWFyZWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICBkaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZGlyZWN0aW9uLnNjYWxlKEdhbWUuZGVsdGFUaW1lICogdGhpcy5zcGVlZCk7XHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRlKGRpcmVjdGlvbi50b1ZlY3RvcjMoKSk7XHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZSA8IDEpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY291bnRlciA9ICh0aGlzLmNvdW50ZXIgKyAxKSAlIHRoaXMucGxheWVyU2l6ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLm5leHRUYXJnZXQgPSB0aGlzLmF2YXRhcnNbdGhpcy5jb3VudGVyXS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgQ29sbGlkZXIge1xyXG4gICAgZXhwb3J0IGNsYXNzIENvbGxpZGVyIHtcclxuICAgICAgICBwdWJsaWMgb3duZXJOZXRJZDogbnVtYmVyO1xyXG4gICAgICAgIHByaXZhdGUgcmFkaXVzOiBudW1iZXI7IGdldCBnZXRSYWRpdXMoKTogbnVtYmVyIHsgcmV0dXJuIHRoaXMucmFkaXVzIH07XHJcbiAgICAgICAgcHVibGljIHBvc2l0aW9uOiDGki5WZWN0b3IyO1xyXG5cclxuICAgICAgICBnZXQgdG9wKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55IC0gdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgbGVmdCgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gKHRoaXMucG9zaXRpb24ueCAtIHRoaXMucmFkaXVzKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZ2V0IHJpZ2h0KCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi54ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBnZXQgYm90dG9tKCk6IG51bWJlciB7XHJcbiAgICAgICAgICAgIHJldHVybiAodGhpcy5wb3NpdGlvbi55ICsgdGhpcy5yYWRpdXMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfcmFkaXVzOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgICAgIHRoaXMucmFkaXVzID0gX3JhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5vd25lck5ldElkID0gX25ldElkO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFBvc2l0aW9uKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyKSB7XHJcbiAgICAgICAgICAgIHRoaXMucG9zaXRpb24gPSBfcG9zaXRpb247XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgc2V0UmFkaXVzKF9uZXdSYWRpdXM6IG51bWJlcikge1xyXG4gICAgICAgICAgICB0aGlzLnJhZGl1cyA9IF9uZXdSYWRpdXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlcyhfY29sbGlkZXI6IENvbGxpZGVyKTogYm9vbGVhbiB7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZTogxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvc2l0aW9uLCBfY29sbGlkZXIucG9zaXRpb24pO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5yYWRpdXMgKyBfY29sbGlkZXIucmFkaXVzID4gZGlzdGFuY2UubWFnbml0dWRlKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBjb2xsaWRlc1JlY3QoX2NvbGxpZGVyOiBHYW1lLsaSLlJlY3RhbmdsZSk6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5sZWZ0ID4gX2NvbGxpZGVyLnJpZ2h0KSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnJpZ2h0IDwgX2NvbGxpZGVyLmxlZnQpIHJldHVybiBmYWxzZTtcclxuICAgICAgICAgICAgaWYgKHRoaXMudG9wID4gX2NvbGxpZGVyLmJvdHRvbSkgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICBpZiAodGhpcy5ib3R0b20gPCBfY29sbGlkZXIudG9wKSByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uKF9jb2xsaWRlcjogQ29sbGlkZXIpOiBudW1iZXIge1xyXG4gICAgICAgICAgICBpZiAoIXRoaXMuY29sbGlkZXMoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGRpc3RhbmNlOiDGki5WZWN0b3IyID0gxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zaXRpb24sIF9jb2xsaWRlci5wb3NpdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBpbnRlcnNlY3Rpb24gPSB0aGlzLnJhZGl1cyArIF9jb2xsaWRlci5yYWRpdXMgLSBkaXN0YW5jZS5tYWduaXR1ZGU7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZ2V0SW50ZXJzZWN0aW9uUmVjdChfY29sbGlkZXI6IMaSLlJlY3RhbmdsZSk6IMaSLlJlY3RhbmdsZSB7XHJcbiAgICAgICAgICAgIGlmICghdGhpcy5jb2xsaWRlc1JlY3QoX2NvbGxpZGVyKSlcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG5cclxuICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogxpIuUmVjdGFuZ2xlID0gbmV3IMaSLlJlY3RhbmdsZSgpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueCA9IE1hdGgubWF4KHRoaXMubGVmdCwgX2NvbGxpZGVyLmxlZnQpO1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24ueSA9IE1hdGgubWF4KHRoaXMudG9wLCBfY29sbGlkZXIudG9wKTtcclxuICAgICAgICAgICAgaW50ZXJzZWN0aW9uLndpZHRoID0gTWF0aC5taW4odGhpcy5yaWdodCwgX2NvbGxpZGVyLnJpZ2h0KSAtIGludGVyc2VjdGlvbi54O1xyXG4gICAgICAgICAgICBpbnRlcnNlY3Rpb24uaGVpZ2h0ID0gTWF0aC5taW4odGhpcy5ib3R0b20sIF9jb2xsaWRlci5ib3R0b20pIC0gaW50ZXJzZWN0aW9uLnk7XHJcblxyXG4gICAgICAgICAgICByZXR1cm4gaW50ZXJzZWN0aW9uO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIm5hbWVzcGFjZSBFbmVteVNwYXduZXIge1xyXG4gICAgbGV0IHNwYXduVGltZTogbnVtYmVyID0gMCAqIDYwO1xyXG4gICAgbGV0IGN1cnJlbnRUaW1lOiBudW1iZXIgPSBzcGF3blRpbWU7XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduTXVsdGlwbGVFbmVtaWVzQXRSb29tKF9tYXhFbmVtaWVzOiBudW1iZXIsIF9yb29tUG9zOiBHYW1lLsaSLlZlY3RvcjIpOiB2b2lkIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogZGVwZW5kaW5nIG9uIGN1cnJlbnRyb29tLmVuZW15Q291bnQgYW5kIGRlY3JlYXNlIGl0IFxyXG4gICAgICAgICAgICBsZXQgc3Bhd25lZEVuZW1pZXM6IG51bWJlciA9IDA7XHJcbiAgICAgICAgICAgIHdoaWxlIChzcGF3bmVkRW5lbWllcyA8IF9tYXhFbmVtaWVzKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoY3VycmVudFRpbWUgPT0gc3Bhd25UaW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uID0gbmV3IMaSLlZlY3RvcjIoKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpIC0gKChNYXRoLnJhbmRvbSgpICogR2FtZS5jdXJyZW50Um9vbS5yb29tU2l6ZSAvIDIpKSksICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSAtICgoTWF0aC5yYW5kb20oKSAqIEdhbWUuY3VycmVudFJvb20ucm9vbVNpemUgLyAyKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBwb3NpdGlvbi5hZGQoX3Jvb21Qb3MpO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vVE9ETzogdXNlIElEIHRvIGdldCByYW5kb20gZW5lbWllc1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduQnlJRChFbmVteS5FTkVNWUNMQVNTLkVORU1ZRFVNQiwgRW50aXR5LklELlNNQUxMVElDSywgcG9zaXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHNwYXduZWRFbmVtaWVzKys7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjdXJyZW50VGltZS0tO1xyXG4gICAgICAgICAgICAgICAgaWYgKGN1cnJlbnRUaW1lIDw9IDApIHtcclxuICAgICAgICAgICAgICAgICAgICBjdXJyZW50VGltZSA9IHNwYXduVGltZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZXRSYW5kb21FbmVteUlkKCk6IG51bWJlciB7XHJcbiAgICAgICAgbGV0IHJhbmRvbSA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIE9iamVjdC5rZXlzKEVudGl0eS5JRCkubGVuZ3RoIC8gMik7XHJcbiAgICAgICAgaWYgKHJhbmRvbSA8PSAyKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZXRSYW5kb21FbmVteUlkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBjb25zb2xlLmxvZyhyYW5kb20pO1xyXG4gICAgICAgICAgICByZXR1cm4gcmFuZG9tO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25CeUlEKF9lbmVteUNsYXNzOiBFbmVteS5FTkVNWUNMQVNTLCBfaWQ6IEVudGl0eS5JRCwgX3Bvc2l0aW9uOiDGki5WZWN0b3IyLCBfdGFyZ2V0PzogUGxheWVyLlBsYXllciwgX25ldElEPzogbnVtYmVyKSB7XHJcbiAgICAgICAgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgICAgICBzd2l0Y2ggKF9lbmVteUNsYXNzKSB7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5FTkVNWURBU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteURhc2goX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15RGFzaChfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuRU5FTVlEVU1COlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlEdW1iKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteUR1bWIoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZUEFUUk9MOlxyXG4gICAgICAgICAgICAgICAgaWYgKF9uZXRJRCA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlQYXRyb2woX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15UGF0cm9sKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIC8vIGNhc2UgRW5lbXkuRTpcclxuICAgICAgICAgICAgLy8gICAgIGlmIChfbmV0SUQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAvLyAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LkVuZW15U2hvb3QoX2lkLCBuZXcgRW50aXR5LkF0dHJpYnV0ZXMocmVmLmF0dHJpYnV0ZXMuaGVhbHRoUG9pbnRzLCByZWYuYXR0cmlidXRlcy5hdHRhY2tQb2ludHMsIHJlZi5hdHRyaWJ1dGVzLnNwZWVkLCByZWYuYXR0cmlidXRlcy5zY2FsZSwgTWF0aC5yYW5kb20oKSAqIHJlZi5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlICsgMC41LCByZWYuYXR0cmlidXRlcy5hcm1vciksIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgLy8gICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIC8vICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuRW5lbXlTaG9vdChfaWQsIF9hdHRyaWJ1dGVzLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgIC8vICAgICB9XHJcbiAgICAgICAgICAgIC8vICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBFbmVteS5FTkVNWUNMQVNTLkVORU1ZU01BU0g6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5FbmVteVNtYXNoKF9pZCwgX3Bvc2l0aW9uLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgRW5lbXkuRU5FTVlDTEFTUy5TVU1NT05PUkFERFM6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vckFkZHMoX2lkLCBfcG9zaXRpb24sIF90YXJnZXQsIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGVuZW15ID0gbmV3IEVuZW15LlN1bW1vbm9yQWRkcyhfaWQsIF9wb3NpdGlvbiwgX3RhcmdldCwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEVuZW15LkVORU1ZQ0xBU1MuU1VNTU9OT1I6XHJcbiAgICAgICAgICAgICAgICBpZiAoX25ldElEID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICBlbmVteSA9IG5ldyBFbmVteS5TdW1tb25vcihfaWQsIF9wb3NpdGlvbiwgX25ldElEKTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgZW5lbXkgPSBuZXcgRW5lbXkuU3VtbW9ub3IoX2lkLCBfcG9zaXRpb24sIF9uZXRJRCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoZW5lbXkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGVuZW15KTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkVuZW15KF9lbmVteUNsYXNzLCBlbmVteSwgZW5lbXkubmV0SWQpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbmV0d29ya1NwYXduQnlJZChfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2lkOiBFbnRpdHkuSUQsIF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX25ldElEOiBudW1iZXIsIF90YXJnZXQ/OiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoX3RhcmdldCAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjEubmV0SWQgPT0gX3RhcmdldCkge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIxLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgR2FtZS5hdmF0YXIyLCBfbmV0SUQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgc3Bhd25CeUlEKF9lbmVteUNsYXNzLCBfaWQsIF9wb3NpdGlvbiwgbnVsbCwgX25ldElEKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG59IiwibmFtZXNwYWNlIEVuZW15IHtcclxuXHJcbiAgICBleHBvcnQgY2xhc3MgRmxvY2tpbmdCZWhhdmlvdXIge1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudE5laWdoYm91cnM6IEVuZW15W107XHJcbiAgICAgICAgcHVibGljIHNpZ2h0UmFkaXVzOiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGF2b2lkUmFkaXVzOiBudW1iZXJcclxuICAgICAgICBwcml2YXRlIGVuZW1pZXM6IEVuZW15W10gPSBbXTtcclxuICAgICAgICBwcml2YXRlIHBvczogR2FtZS7Gki5WZWN0b3IyO1xyXG4gICAgICAgIHByaXZhdGUgbXlFbmVteTogRW5lbXk7XHJcbiAgICAgICAgcHVibGljIGNvaGVzaW9uV2VpZ2h0OiBudW1iZXI7XHJcbiAgICAgICAgcHVibGljIGFsbGlnbldlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBhdm9pZFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyB0b1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBub3RUb1RhcmdldFdlaWdodDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBvYnN0aWNhbEF2b2lkV2VpZ2h0OiBudW1iZXIgPSAxLjU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgb2JzdGljYWxDb2xsaWRlcjogQ29sbGlkZXIuQ29sbGlkZXI7XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9lbmVteTogRW5lbXksIF9zaWdodFJhZGl1czogbnVtYmVyLCBfYXZvaWRSYWRpdXM6IG51bWJlciwgX2NvaGVzaW9uV2VpZ2h0OiBudW1iZXIsIF9hbGxpZ25XZWlnaHQ6IG51bWJlciwgX2F2b2lkV2VpZ2h0OiBudW1iZXIsIF90b1RhcmdldFdlaWdodDogbnVtYmVyLCBfbm90VG9UYXJnZXRXZWlnaHQ6IG51bWJlciwgX29ic3RpY2FsQXZvaWRXZWlnaHQ/OiBudW1iZXIpIHtcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSBfZW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMubXlFbmVteSA9IF9lbmVteTtcclxuICAgICAgICAgICAgdGhpcy5zaWdodFJhZGl1cyA9IF9zaWdodFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5hdm9pZFJhZGl1cyA9IF9hdm9pZFJhZGl1cztcclxuICAgICAgICAgICAgdGhpcy5jb2hlc2lvbldlaWdodCA9IF9jb2hlc2lvbldlaWdodDtcclxuICAgICAgICAgICAgdGhpcy5hbGxpZ25XZWlnaHQgPSBfYWxsaWduV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLmF2b2lkV2VpZ2h0ID0gX2F2b2lkV2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLnRvVGFyZ2V0V2VpZ2h0ID0gX3RvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICB0aGlzLm5vdFRvVGFyZ2V0V2VpZ2h0ID0gX25vdFRvVGFyZ2V0V2VpZ2h0O1xyXG4gICAgICAgICAgICBpZiAoX29ic3RpY2FsQXZvaWRXZWlnaHQgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ID0gX29ic3RpY2FsQXZvaWRXZWlnaHQ7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlciA9IG5ldyBDb2xsaWRlci5Db2xsaWRlcih0aGlzLnBvcywgdGhpcy5teUVuZW15LmNvbGxpZGVyLmdldFJhZGl1cyAqIDEuNzUsIHRoaXMubXlFbmVteS5uZXRJZCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICB1cGRhdGUoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbWllcyA9IEdhbWUuZW5lbWllcztcclxuICAgICAgICAgICAgdGhpcy5wb3MgPSB0aGlzLm15RW5lbXkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbiA9IHRoaXMucG9zO1xyXG4gICAgICAgICAgICB0aGlzLmZpbmROZWlnaGJvdXJzKCk7XHJcbiAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBmaW5kTmVpZ2hib3VycygpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3VycyA9IFtdO1xyXG4gICAgICAgICAgICB0aGlzLmVuZW1pZXMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm15RW5lbXkubmV0SWQgIT0gZW5lbS5uZXRJZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLmdldERpc3RhbmNlKHRoaXMucG9zLnRvVmVjdG9yMygpKSA8IHRoaXMuc2lnaHRSYWRpdXMpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5wdXNoKGVuZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjYWxjdWxhdGVDb2hlc2lvbk1vdmUoKTogR2FtZS7Gki5WZWN0b3IyIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoIDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiDGki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGxldCBjb2hlc2lvbk1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZSA9IEdhbWUuxpIuVmVjdG9yMi5TVU0oY29oZXNpb25Nb3ZlLCBlbmVtLm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUuc2NhbGUoMSAvIHRoaXMuY3VycmVudE5laWdoYm91cnMubGVuZ3RoKTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uTW92ZS5zdWJ0cmFjdCh0aGlzLnBvcyk7XHJcbiAgICAgICAgICAgICAgICBjb2hlc2lvbk1vdmUgPSBDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKHRoaXMubXlFbmVteS5tb3ZlRGlyZWN0aW9uLCBDYWxjdWxhdGlvbi5jYWxjRGVncmVlKHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbiwgY29oZXNpb25Nb3ZlLnRvVmVjdG9yMygpKSAvIDEwKS50b1ZlY3RvcjIoKVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGNvaGVzaW9uTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZUFsbGlnbm1lbnRNb3ZlKCk6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnROZWlnaGJvdXJzLmxlbmd0aCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5teUVuZW15Lm1vdmVEaXJlY3Rpb24udG9WZWN0b3IyKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgYWxsaWdubWVudE1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5mb3JFYWNoKGVuZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgIGFsbGlnbm1lbnRNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhbGxpZ25tZW50TW92ZSwgZW5lbS5tb3ZlRGlyZWN0aW9uLnRvVmVjdG9yMigpKTtcclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBhbGxpZ25tZW50TW92ZS5zY2FsZSgxIC8gdGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGgpO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGFsbGlnbm1lbnRNb3ZlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2FsY3VsYXRlQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50TmVpZ2hib3Vycy5sZW5ndGggPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgbGV0IGF2b2lkYW5jZU1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgICAgICAgICAgbGV0IG5Bdm9pZDogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgICAgIHRoaXMuY3VycmVudE5laWdoYm91cnMuZm9yRWFjaChlbmVtID0+IHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5nZXREaXN0YW5jZSh0aGlzLnBvcy50b1ZlY3RvcjMoKSkgPCB0aGlzLmF2b2lkUmFkaXVzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5Bdm9pZCsrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBhdm9pZGFuY2VNb3ZlID0gR2FtZS7Gki5WZWN0b3IyLlNVTShhdm9pZGFuY2VNb3ZlLCBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgZW5lbS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH0pXHJcbiAgICAgICAgICAgICAgICBpZiAobkF2b2lkID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGF2b2lkYW5jZU1vdmUuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gYXZvaWRhbmNlTW92ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgb2JzdGljYWxzOiBHYW1lLsaSLk5vZGVbXSA9IFtdO1xyXG4gICAgICAgICAgICBHYW1lLmN1cnJlbnRSb29tLndhbGxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIEdhbWUuY3VycmVudFJvb20ub2JzdGljYWxzLmZvckVhY2goZWxlbSA9PiB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbHMucHVzaChlbGVtKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIGxldCByZXR1cm5WZWN0b3I6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBuQXZvaWQ6IG51bWJlciA9IDA7XHJcblxyXG4gICAgICAgICAgICBvYnN0aWNhbHMuZm9yRWFjaChvYnN0aWNhbCA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyIGluc3RhbmNlb2YgR2FtZS7Gki5SZWN0YW5nbGUgJiYgdGhpcy5vYnN0aWNhbENvbGxpZGVyLmNvbGxpZGVzUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmU6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMucG9zLCBvYnN0aWNhbC5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbW92ZS5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGludGVyc2VjdGlvbjogR2FtZS7Gki5SZWN0YW5nbGUgPSB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuZ2V0SW50ZXJzZWN0aW9uUmVjdCgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBhcmVhQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5vYnN0aWNhbENvbGxpZGVyLnBvc2l0aW9uLmFkZChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXNSZWN0KCg8YW55Pm9ic3RpY2FsKS5jb2xsaWRlcikpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaW50ZXJzZWN0aW9uID0gdGhpcy5vYnN0aWNhbENvbGxpZGVyLmdldEludGVyc2VjdGlvblJlY3QoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGFmdGVyQmVmb3JlTW92ZTogbnVtYmVyID0gaW50ZXJzZWN0aW9uLndpZHRoICogaW50ZXJzZWN0aW9uLmhlaWdodDtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChhcmVhQmVmb3JlTW92ZSA8PSBhZnRlckJlZm9yZU1vdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMigwLCBtb3ZlLnkpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJldHVyblZlY3Rvci5hZGQobmV3IEdhbWUuxpIuVmVjdG9yMihtb3ZlLngsIDApKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMub2JzdGljYWxDb2xsaWRlci5wb3NpdGlvbi5zdWJ0cmFjdChuZXcgR2FtZS7Gki5WZWN0b3IyKG1vdmUueCwgMCkpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGlmICgoPGFueT5vYnN0aWNhbCkuY29sbGlkZXIgaW5zdGFuY2VvZiBDb2xsaWRlci5Db2xsaWRlciAmJiB0aGlzLm9ic3RpY2FsQ29sbGlkZXIuY29sbGlkZXMoKDxhbnk+b2JzdGljYWwpLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBtb3ZlOiBHYW1lLsaSLlZlY3RvcjIgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRSh0aGlzLnBvcywgb2JzdGljYWwubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBsb2NhbEF3YXk6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5TVU0obW92ZSwgdGhpcy5teUVuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGRpc3RhbmNlUG9zID0gKEdhbWUuxpIuVmVjdG9yMi5ESUZGRVJFTkNFKHRoaXMubXlFbmVteS50YXJnZXQsIEdhbWUuxpIuVmVjdG9yMi5TVU0oQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChsb2NhbEF3YXkuY2xvbmUudG9WZWN0b3IzKCksIDEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgZGlzdGFuY2VOZWcgPSAoR2FtZS7Gki5WZWN0b3IyLkRJRkZFUkVOQ0UodGhpcy5teUVuZW15LnRhcmdldCwgR2FtZS7Gki5WZWN0b3IyLlNVTShDYWxjdWxhdGlvbi5nZXRSb3RhdGVkVmVjdG9yQnlBbmdsZTJEKGxvY2FsQXdheS5jbG9uZS50b1ZlY3RvcjMoKSwgLTEzNSkudG9WZWN0b3IyKCksIHRoaXMubXlFbmVteS5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSkpKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGRpc3RhbmNlTmVnLm1hZ25pdHVkZVNxdWFyZWQgPiBkaXN0YW5jZVBvcy5tYWduaXR1ZGVTcXVhcmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG1vdmUuYWRkKENhbGN1bGF0aW9uLmdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQobW92ZS5jbG9uZS50b1ZlY3RvcjMoKSwgMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbW92ZS5hZGQoQ2FsY3VsYXRpb24uZ2V0Um90YXRlZFZlY3RvckJ5QW5nbGUyRChtb3ZlLmNsb25lLnRvVmVjdG9yMygpLCAtMTM1KS50b1ZlY3RvcjIoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3IuYWRkKG1vdmUpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBuQXZvaWQrKztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSlcclxuXHJcbiAgICAgICAgICAgIGlmIChuQXZvaWQgPiAwKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm5WZWN0b3Iuc2NhbGUoMSAvIG5Bdm9pZCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHJldHVybiByZXR1cm5WZWN0b3I7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZ2V0TW92ZVZlY3RvcigpOiBHYW1lLsaSLlZlY3RvcjIge1xyXG4gICAgICAgICAgICBsZXQgY29oZXNpb246IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcbiAgICAgICAgICAgIGxldCBhdm9pZDogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IGFsbGlnbjogR2FtZS7Gki5WZWN0b3IyID0gR2FtZS7Gki5WZWN0b3IyLlpFUk8oKTtcclxuICAgICAgICAgICAgbGV0IG9ic3RpY2FsQXZvaWQ6IEdhbWUuxpIuVmVjdG9yMiA9IEdhbWUuxpIuVmVjdG9yMi5aRVJPKCk7XHJcblxyXG5cclxuICAgICAgICAgICAgbGV0IHRhcmdldCA9IHRoaXMubXlFbmVteS5tb3ZlU2ltcGxlKHRoaXMubXlFbmVteS50YXJnZXQpO1xyXG4gICAgICAgICAgICBpZiAodGFyZ2V0Lm1hZ25pdHVkZVNxdWFyZWQgPiB0aGlzLnRvVGFyZ2V0V2VpZ2h0ICogdGhpcy50b1RhcmdldFdlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIHRhcmdldC5zY2FsZSh0aGlzLnRvVGFyZ2V0V2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG5vdFRvVGFyZ2V0ID0gdGhpcy5teUVuZW15Lm1vdmVBd2F5KHRoaXMubXlFbmVteS50YXJnZXQpXHJcbiAgICAgICAgICAgIGlmIChub3RUb1RhcmdldC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5ub3RUb1RhcmdldFdlaWdodCAqIHRoaXMubm90VG9UYXJnZXRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0Lm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG5vdFRvVGFyZ2V0LnNjYWxlKHRoaXMubm90VG9UYXJnZXRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBjb2hlc2lvbiA9IHRoaXMuY2FsY3VsYXRlQ29oZXNpb25Nb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChjb2hlc2lvbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5jb2hlc2lvbldlaWdodCAqIHRoaXMuY29oZXNpb25XZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGNvaGVzaW9uLnNjYWxlKHRoaXMuY29oZXNpb25XZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGF2b2lkID0gdGhpcy5jYWxjdWxhdGVBdm9pZGFuY2VNb3ZlKCk7XHJcbiAgICAgICAgICAgIGlmIChhdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hdm9pZFdlaWdodCAqIHRoaXMuYXZvaWRXZWlnaHQpIHtcclxuICAgICAgICAgICAgICAgIGF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGF2b2lkLnNjYWxlKHRoaXMuYXZvaWRXZWlnaHQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGFsbGlnbiA9IHRoaXMuY2FsY3VsYXRlQWxsaWdubWVudE1vdmUoKTtcclxuICAgICAgICAgICAgaWYgKGFsbGlnbi5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5hbGxpZ25XZWlnaHQgKiB0aGlzLmFsbGlnbldlaWdodCkge1xyXG4gICAgICAgICAgICAgICAgYWxsaWduLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIGFsbGlnbi5zY2FsZSh0aGlzLmFsbGlnbldlaWdodCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQgPSB0aGlzLmNhbGN1bGF0ZU9ic3RpY2FsQXZvaWRhbmNlTW92ZSgpO1xyXG4gICAgICAgICAgICBpZiAob2JzdGljYWxBdm9pZC5tYWduaXR1ZGVTcXVhcmVkID4gdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0ICogdGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KSB7XHJcbiAgICAgICAgICAgICAgICBvYnN0aWNhbEF2b2lkLm5vcm1hbGl6ZTtcclxuICAgICAgICAgICAgICAgIG9ic3RpY2FsQXZvaWQuc2NhbGUodGhpcy5vYnN0aWNhbEF2b2lkV2VpZ2h0KTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgbGV0IG1vdmUgPSBHYW1lLsaSLlZlY3RvcjIuU1VNKG5vdFRvVGFyZ2V0LCB0YXJnZXQsIGNvaGVzaW9uLCBhdm9pZCwgYWxsaWduLCBvYnN0aWNhbEF2b2lkKTtcclxuICAgICAgICAgICAgcmV0dXJuIG1vdmU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcblxyXG5cclxuIiwibmFtZXNwYWNlIEVudGl0eSB7IFxyXG4gICAgZXhwb3J0IGNsYXNzIE1lcmNoYW50IGV4dGVuZHMgRW50aXR5e1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9pZDogbnVtYmVyLCBfbmV0SWQ/Om51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfaWQsIF9uZXRJZCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIENhbGN1bGF0aW9uIHtcclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRDbG9zZXJBdmF0YXJQb3NpdGlvbihfc3RhcnRQb2ludDogxpIuVmVjdG9yMyk6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCB0YXJnZXQgPSBHYW1lLmF2YXRhcjE7XHJcblxyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCkge1xyXG4gICAgICAgICAgICBsZXQgZGlzdGFuY2VQbGF5ZXIxID0gX3N0YXJ0UG9pbnQuZ2V0RGlzdGFuY2UoR2FtZS5hdmF0YXIxLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbik7XHJcbiAgICAgICAgICAgIGxldCBkaXN0YW5jZVBsYXllcjIgPSBfc3RhcnRQb2ludC5nZXREaXN0YW5jZShHYW1lLmF2YXRhcjIuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChkaXN0YW5jZVBsYXllcjEgPCBkaXN0YW5jZVBsYXllcjIpIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRhcmdldCA9IEdhbWUuYXZhdGFyMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcmV0dXJuIHRhcmdldC5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb247XHJcbiAgICB9XHJcblxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjYWxjRGVncmVlKF9jZW50ZXI6IMaSLlZlY3RvcjMsIF90YXJnZXQ6IMaSLlZlY3RvcjMpOiBudW1iZXIge1xyXG4gICAgICAgIGxldCB4RGlzdGFuY2U6IG51bWJlciA9IF90YXJnZXQueCAtIF9jZW50ZXIueDtcclxuICAgICAgICBsZXQgeURpc3RhbmNlOiBudW1iZXIgPSBfdGFyZ2V0LnkgLSBfY2VudGVyLnk7XHJcbiAgICAgICAgbGV0IGRlZ3JlZXM6IG51bWJlciA9IE1hdGguYXRhbjIoeURpc3RhbmNlLCB4RGlzdGFuY2UpICogKDE4MCAvIE1hdGguUEkpIC0gOTA7XHJcbiAgICAgICAgcmV0dXJuIGRlZ3JlZXM7XHJcblxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGdldFJvdGF0ZWRWZWN0b3JCeUFuZ2xlMkQoX3ZlY3RvclRvUm90YXRlOiDGki5WZWN0b3IzLCBfYW5nbGU6IG51bWJlcik6IMaSLlZlY3RvcjMge1xyXG4gICAgICAgIGxldCBhbmdsZVRvUmFkaWFuOiBudW1iZXIgPSBfYW5nbGUgKiAoTWF0aC5QSSAvIDE4MCk7XHJcblxyXG4gICAgICAgIGxldCBuZXdYID0gX3ZlY3RvclRvUm90YXRlLnggKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKSAtIF92ZWN0b3JUb1JvdGF0ZS55ICogTWF0aC5zaW4oYW5nbGVUb1JhZGlhbik7XHJcbiAgICAgICAgbGV0IG5ld1kgPSBfdmVjdG9yVG9Sb3RhdGUueCAqIE1hdGguc2luKGFuZ2xlVG9SYWRpYW4pICsgX3ZlY3RvclRvUm90YXRlLnkgKiBNYXRoLmNvcyhhbmdsZVRvUmFkaWFuKTtcclxuXHJcbiAgICAgICAgcmV0dXJuIG5ldyDGki5WZWN0b3IzKG5ld1gsIG5ld1ksIF92ZWN0b3JUb1JvdGF0ZS56KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gYWRkUGVyY2VudGFnZUFtb3VudFRvVmFsdWUoX2Jhc2VWYWx1ZTogbnVtYmVyLCBfcGVyY2VudGFnZUFtb3VudDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICByZXR1cm4gX2Jhc2VWYWx1ZSAqICgoMTAwICsgX3BlcmNlbnRhZ2VBbW91bnQpIC8gMTAwKTtcclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzdWJQZXJjZW50YWdlQW1vdW50VG9WYWx1ZShfYmFzZVZhbHVlOiBudW1iZXIsIF9wZXJjZW50YWdlQW1vdW50OiBudW1iZXIpOiBudW1iZXIge1xyXG4gICAgICAgIHJldHVybiBfYmFzZVZhbHVlICogKDEwMCAvICgxMDAgKyBfcGVyY2VudGFnZUFtb3VudCkpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBjbGFtcE51bWJlcihfbnVtYmVyOiBudW1iZXIsIF9taW46IG51bWJlciwgX21heDogbnVtYmVyKSB7XHJcbiAgICAgICAgcmV0dXJuIE1hdGgubWF4KF9taW4sIE1hdGgubWluKF9udW1iZXIsIF9tYXgpKTtcclxuICAgIH1cclxuXHJcblxyXG59IiwibmFtZXNwYWNlIElucHV0U3lzdGVtIHtcclxuXHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBrZXlib2FyZERvd25FdmVudCk7XHJcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwia2V5dXBcIiwga2V5Ym9hcmRVcEV2ZW50KTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgYXR0YWNrKTtcclxuICAgIEdhbWUuY2FudmFzLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgcm90YXRlVG9Nb3VzZSk7XHJcblxyXG4gICAgLy8jcmVnaW9uIHJvdGF0ZVxyXG4gICAgbGV0IG1vdXNlUG9zaXRpb246IMaSLlZlY3RvcjM7XHJcblxyXG4gICAgZnVuY3Rpb24gcm90YXRlVG9Nb3VzZShfbW91c2VFdmVudDogTW91c2VFdmVudCk6IHZvaWQge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQgcmF5OiDGki5SYXkgPSBHYW1lLnZpZXdwb3J0LmdldFJheUZyb21DbGllbnQobmV3IMaSLlZlY3RvcjIoX21vdXNlRXZlbnQub2Zmc2V0WCwgX21vdXNlRXZlbnQub2Zmc2V0WSkpO1xyXG4gICAgICAgICAgICBtb3VzZVBvc2l0aW9uID0gcmF5LmludGVyc2VjdFBsYW5lKG5ldyDGki5WZWN0b3IzKDAsIDAsIDApLCBuZXcgxpIuVmVjdG9yMygwLCAwLCAxKSk7XHJcbiAgICAgICAgICAgIC8vIEdhbWUuYXZhdGFyMS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ldyDGki5WZWN0b3IzKDAsIDAsIENhbGN1bGF0aW9uLmNhbGNEZWdyZWUoR2FtZS5hdmF0YXIxLm10eExvY2FsLnRyYW5zbGF0aW9uLCBtb3VzZVBvc2l0aW9uKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY2FsY1Bvc2l0aW9uRnJvbURlZ3JlZShfZGVncmVlczogbnVtYmVyLCBfZGlzdGFuY2U6IG51bWJlcik6IMaSLlZlY3RvcjIge1xyXG4gICAgICAgIGxldCBkaXN0YW5jZSA9IDU7XHJcbiAgICAgICAgbGV0IG5ld0RlZyA9IChfZGVncmVlcyAqIE1hdGguUEkpIC8gMTgwO1xyXG4gICAgICAgIGxldCB5ID0gTWF0aC5jb3MobmV3RGVnKTtcclxuICAgICAgICBsZXQgeCA9IE1hdGguc2luKG5ld0RlZykgKiAtMTtcclxuICAgICAgICBsZXQgY29vcmQgPSBuZXcgxpIuVmVjdG9yMih4LCB5KTtcclxuICAgICAgICBjb29yZC5zY2FsZShkaXN0YW5jZSk7XHJcbiAgICAgICAgcmV0dXJuIGNvb3JkO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIG1vdmUgYW5kIGFiaWxpdHlcclxuICAgIGxldCBjb250cm9sbGVyID0gbmV3IE1hcDxzdHJpbmcsIGJvb2xlYW4+KFtcclxuICAgICAgICBbXCJXXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJBXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJTXCIsIGZhbHNlXSxcclxuICAgICAgICBbXCJEXCIsIGZhbHNlXVxyXG4gICAgXSk7XHJcblxyXG4gICAgZnVuY3Rpb24ga2V5Ym9hcmREb3duRXZlbnQoX2U6IEtleWJvYXJkRXZlbnQpIHtcclxuICAgICAgICBpZiAoR2FtZS5nYW1lc3RhdGUgPT0gR2FtZS5HQU1FU1RBVEVTLlBMQVlJTkcpIHtcclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSA9PSBcIktFWUVcIikge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9lLmNvZGUudG9VcHBlckNhc2UoKSAhPSBcIlNQQUNFXCIpIHtcclxuICAgICAgICAgICAgICAgIGxldCBrZXk6IHN0cmluZyA9IF9lLmNvZGUudG9VcHBlckNhc2UoKS5zdWJzdHJpbmcoMyk7XHJcbiAgICAgICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZS5jb2RlLnRvVXBwZXJDYXNlKCkgPT0gXCJTUEFDRVwiKSB7XHJcbiAgICAgICAgICAgICAgICAvL0RvIGFiaWx0eSBmcm9tIHBsYXllclxyXG4gICAgICAgICAgICAgICAgYWJpbGl0eSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpZiAoX2UuY29kZS50b1VwcGVyQ2FzZSgpID09IFwiRVNDQVBFXCIpIHtcclxuICAgICAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLnBhdXNlKHRydWUsIHRydWUpO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5wbGF5aW5nKHRydWUsIHRydWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGtleWJvYXJkVXBFdmVudChfZTogS2V5Ym9hcmRFdmVudCkge1xyXG4gICAgICAgIGlmIChHYW1lLmdhbWVzdGF0ZSA9PSBHYW1lLkdBTUVTVEFURVMuUExBWUlORykge1xyXG4gICAgICAgICAgICBsZXQga2V5OiBzdHJpbmcgPSBfZS5jb2RlLnRvVXBwZXJDYXNlKCkuc3Vic3RyaW5nKDMpO1xyXG4gICAgICAgICAgICBjb250cm9sbGVyLnNldChrZXksIGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIG1vdmUoKTogR2FtZS7Gki5WZWN0b3IzIHtcclxuICAgICAgICBsZXQgbW92ZVZlY3RvcjogR2FtZS7Gki5WZWN0b3IzID0gR2FtZS7Gki5WZWN0b3IzLlpFUk8oKTtcclxuXHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiV1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgKz0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiQVwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggLT0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiU1wiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnkgLT0gMTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNvbnRyb2xsZXIuZ2V0KFwiRFwiKSkge1xyXG4gICAgICAgICAgICBtb3ZlVmVjdG9yLnggKz0gMTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIEdhbWUuYXZhdGFyMS5tb3ZlKG1vdmVWZWN0b3IpO1xyXG4gICAgICAgIHJldHVybiBtb3ZlVmVjdG9yO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFiaWxpdHkoKSB7XHJcbiAgICAgICAgR2FtZS5hdmF0YXIxLmRvQWJpbGl0eSgpO1xyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGF0dGFja1xyXG4gICAgZnVuY3Rpb24gYXR0YWNrKGVfOiBNb3VzZUV2ZW50KSB7XHJcbiAgICAgICAgaWYgKEdhbWUuZ2FtZXN0YXRlID09IEdhbWUuR0FNRVNUQVRFUy5QTEFZSU5HKSB7XHJcbiAgICAgICAgICAgIGxldCBtb3VzZUJ1dHRvbiA9IGVfLmJ1dHRvbjtcclxuICAgICAgICAgICAgc3dpdGNoIChtb3VzZUJ1dHRvbikge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAwOlxyXG4gICAgICAgICAgICAgICAgICAgIC8vbGVmdCBtb3VzZSBidXR0b24gcGxheWVyLmF0dGFja1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBkaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyA9IMaSLlZlY3RvcjMuRElGRkVSRU5DRShtb3VzZVBvc2l0aW9uLCBHYW1lLmF2YXRhcjEubXR4TG9jYWwudHJhbnNsYXRpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgIHJvdGF0ZVRvTW91c2UoZV8pO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5hdHRhY2soZGlyZWN0aW9uLCBudWxsLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgMjpcclxuICAgICAgICAgICAgICAgICAgICAvL1RPRE86IHJpZ2h0IG1vdXNlIGJ1dHRvbiBwbGF5ZXIuaGVhdnlBdHRhY2sgb3Igc29tZXRoaW5nIGxpa2UgdGhhdFxyXG5cclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcbn0iLCJuYW1lc3BhY2UgTGV2ZWwge1xyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBMYW5kc2NhcGUgZXh0ZW5kcyDGki5Ob2Rle1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9uYW1lOiBzdHJpbmcpIHtcclxuICAgICAgICAgICAgc3VwZXIoX25hbWUpO1xyXG5cclxuICAgICAgICAgICAgLy8gdGhpcy5nZXRDaGlsZHJlbigpWzBdLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSkubXR4TG9jYWwudHJhbnNsYXRlWigtMilcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxufSIsIm5hbWVzcGFjZSBVSSB7XHJcbiAgICBleHBvcnQgY2xhc3MgTWluaW1hcCBleHRlbmRzIEdhbWUuxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuVUk7XHJcbiAgICAgICAgcHJpdmF0ZSBtaW5tYXBJbmZvOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXTtcclxuICAgICAgICBwcml2YXRlIHJvb21NaW5pbWFwc2l6ZTogbnVtYmVyID0gMC44O1xyXG4gICAgICAgIHByaXZhdGUgbWluaVJvb21zOiBNaW5pUm9vbVtdID0gW107XHJcbiAgICAgICAgcHVibGljIG9mZnNldFg6IG51bWJlciA9IDExO1xyXG4gICAgICAgIHB1YmxpYyBvZmZzZXRZOiBudW1iZXIgPSA2O1xyXG4gICAgICAgIHByaXZhdGUgY3VycmVudFJvb206IEdlbmVyYXRpb24uUm9vbTtcclxuICAgICAgICBwcml2YXRlIHBvaW50ZXI6IEdhbWUuxpIuTm9kZTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX21pbmltYXBJbmZvOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXSkge1xyXG4gICAgICAgICAgICBzdXBlcihcIk1pbmltYXBcIik7XHJcbiAgICAgICAgICAgIHRoaXMubWlubWFwSW5mbyA9IF9taW5pbWFwSW5mbztcclxuXHJcblxyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIgPSBuZXcgR2FtZS7Gki5Ob2RlKFwicG9pbnRlclwiKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgR2FtZS7Gki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLnBvaW50ZXIuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJjaGFsbGVuZ2VSb29tTWF0XCIsIMaSLlNoYWRlckxpdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmx1ZVwiKSkpKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5wb2ludGVyLm10eExvY2FsLnNjYWxlKEdhbWUuxpIuVmVjdG9yMy5PTkUodGhpcy5yb29tTWluaW1hcHNpemUgLyAyKSk7XHJcbiAgICAgICAgICAgIHRoaXMucG9pbnRlci5tdHhMb2NhbC50cmFuc2xhdGVaKDEwKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQodGhpcy5wb2ludGVyKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC5zY2FsZShuZXcgR2FtZS7Gki5WZWN0b3IzKHRoaXMucm9vbU1pbmltYXBzaXplLCB0aGlzLnJvb21NaW5pbWFwc2l6ZSwgdGhpcy5yb29tTWluaW1hcHNpemUpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRFdmVudExpc3RlbmVyKEdhbWUuxpIuRVZFTlQuUkVOREVSX1BSRVBBUkUsIHRoaXMuZXZlbnRVcGRhdGUpO1xyXG5cclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3JlYXRlTWluaVJvb21zKCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnNldEN1cnJlbnRSb29tKEdhbWUuY3VycmVudFJvb20pO1xyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bk1pbmltYXAodGhpcy5taW5tYXBJbmZvKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgY3JlYXRlTWluaVJvb21zKCkge1xyXG4gICAgICAgICAgICB0aGlzLm1pbm1hcEluZm8uZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMubWluaVJvb21zLnB1c2gobmV3IE1pbmlSb29tKGVsZW1lbnQuY29vcmRzLCBlbGVtZW50LnJvb21UeXBlKSk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB0aGlzLm1pbmlSb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5hZGRDaGlsZChyb29tKTtcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGV2ZW50VXBkYXRlID0gKF9ldmVudDogRXZlbnQpOiB2b2lkID0+IHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUoKTtcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBwcml2YXRlIHNldEN1cnJlbnRSb29tKF9yb29tOiBHZW5lcmF0aW9uLlJvb20pIHtcclxuICAgICAgICAgICAgdGhpcy5taW5pUm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKF9yb29tLmNvb3JkaW5hdGVzKSkuaXNEaXNjb3ZlcmVkKCk7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRSb29tICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1YlggPSB0aGlzLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnggLSBfcm9vbS5jb29yZGluYXRlcy54O1xyXG4gICAgICAgICAgICAgICAgbGV0IHN1YlkgPSB0aGlzLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkgLSBfcm9vbS5jb29yZGluYXRlcy55O1xyXG4gICAgICAgICAgICAgICAgdGhpcy5vZmZzZXRYICs9IHN1YlggKiB0aGlzLnJvb21NaW5pbWFwc2l6ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMub2Zmc2V0WSArPSBzdWJZICogdGhpcy5yb29tTWluaW1hcHNpemU7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudFJvb20gPSBfcm9vbTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudFJvb20gIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50Um9vbSAhPSBHYW1lLmN1cnJlbnRSb29tKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRDdXJyZW50Um9vbShHYW1lLmN1cnJlbnRSb29tKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICB0aGlzLnBvaW50ZXIubXR4TG9jYWwudHJhbnNsYXRpb24gPSB0aGlzLm1pbmlSb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcykpLm10eExvY2FsLnRyYW5zbGF0aW9uO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBsZXQgbm9ybWFsUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgY2hhbGxlbmdlUm9vbTogxpIuVGV4dHVyZUltYWdlID0gbmV3IMaSLlRleHR1cmVJbWFnZSgpOztcclxuICAgIGV4cG9ydCBsZXQgbWVyY2hhbnRSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG4gICAgZXhwb3J0IGxldCB0cmVhc3VyZVJvb206IMaSLlRleHR1cmVJbWFnZSA9IG5ldyDGki5UZXh0dXJlSW1hZ2UoKTs7XHJcbiAgICBleHBvcnQgbGV0IGJvc3NSb29tOiDGki5UZXh0dXJlSW1hZ2UgPSBuZXcgxpIuVGV4dHVyZUltYWdlKCk7O1xyXG5cclxuICAgIGNsYXNzIE1pbmlSb29tIGV4dGVuZHMgR2FtZS7Gki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgZGlzY292ZXJlZDogYm9vbGVhbjtcclxuICAgICAgICBwdWJsaWMgY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMjtcclxuICAgICAgICBwdWJsaWMgcm9vbVR5cGU6IEdlbmVyYXRpb24uUk9PTVRZUEU7XHJcbiAgICAgICAgcHVibGljIG9wYWNpdHk6IG51bWJlciA9IDAuNzU7XHJcblxyXG4gICAgICAgIHByaXZhdGUgcm9vbU1hdDogxpIuTWF0ZXJpYWw7XHJcblxyXG5cclxuICAgICAgICBwcml2YXRlIG1lc2g6IMaSLk1lc2hRdWFkID0gbmV3IMaSLk1lc2hRdWFkO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21UeXBlOiBHZW5lcmF0aW9uLlJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiTWluaW1hcFJvb21cIik7XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpbmF0ZXM7XHJcbiAgICAgICAgICAgIHRoaXMucm9vbVR5cGUgPSBfcm9vbVR5cGU7XHJcbiAgICAgICAgICAgIHRoaXMuZGlzY292ZXJlZCA9IGZhbHNlO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50TWVzaCh0aGlzLm1lc2gpKTtcclxuXHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWw7XHJcblxyXG4gICAgICAgICAgICBzd2l0Y2ggKHRoaXMucm9vbVR5cGUpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5TVEFSVDpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIG5vcm1hbFJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBub3JtYWxSb29tKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuTUVSQ0hBTlQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yb29tTWF0ID0gbmV3IMaSLk1hdGVyaWFsKFwicm9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiLCB0aGlzLm9wYWNpdHkpLCBtZXJjaGFudFJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIHRyZWFzdXJlUm9vbSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLkNIQUxMRU5HRTpcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJvb21NYXQgPSBuZXcgxpIuTWF0ZXJpYWwoXCJyb29tTWF0XCIsIMaSLlNoYWRlckxpdFRleHR1cmVkLCBuZXcgxpIuQ29hdFJlbWlzc2l2ZVRleHR1cmVkKMaSLkNvbG9yLkNTUyhcIndoaXRlXCIsIHRoaXMub3BhY2l0eSksIGNoYWxsZW5nZVJvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTOlxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMucm9vbU1hdCA9IG5ldyDGki5NYXRlcmlhbChcInJvb21NYXRcIiwgxpIuU2hhZGVyTGl0VGV4dHVyZWQsIG5ldyDGki5Db2F0UmVtaXNzaXZlVGV4dHVyZWQoxpIuQ29sb3IuQ1NTKFwid2hpdGVcIiwgdGhpcy5vcGFjaXR5KSwgYm9zc1Jvb20pKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjbXBNYXRlcmlhbCA9IG5ldyDGki5Db21wb25lbnRNYXRlcmlhbCh0aGlzLnJvb21NYXQpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChjbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKHRoaXMuY29vcmRpbmF0ZXMueCwgdGhpcy5jb29yZGluYXRlcy55LCAxKTtcclxuICAgICAgICAgICAgLy8gdGhpcy5hY3RpdmF0ZShmYWxzZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgaXNEaXNjb3ZlcmVkKCkge1xyXG4gICAgICAgICAgICB0aGlzLmRpc2NvdmVyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxufSIsIi8vLzxyZWZlcmVuY2UgcGF0aD1cIi4uL0ZVREdFL05ldC9CdWlsZC9DbGllbnQvRnVkZ2VDbGllbnQuZC50c1wiLz5cclxuXHJcbm5hbWVzcGFjZSBOZXR3b3JraW5nIHtcclxuICAgIGV4cG9ydCBlbnVtIEZVTkNUSU9OIHtcclxuICAgICAgICBDT05ORUNURUQsXHJcbiAgICAgICAgU0VUR0FNRVNUQVRFLFxyXG4gICAgICAgIExPQURFRCxcclxuICAgICAgICBTRVRSRUFEWSxcclxuICAgICAgICBTUEFXTixcclxuICAgICAgICBUUkFOU0ZPUk0sXHJcbiAgICAgICAgQ0xJRU5UTU9WRU1FTlQsXHJcbiAgICAgICAgU0VSVkVSQlVGRkVSLFxyXG4gICAgICAgIFVQREFURUlOVkVOVE9SWSxcclxuICAgICAgICBLTk9DS0JBQ0tSRVFVRVNULFxyXG4gICAgICAgIEtOT0NLQkFDS1BVU0gsXHJcbiAgICAgICAgU1BBV05CVUxMRVQsXHJcbiAgICAgICAgQlVMTEVUUFJFRElDVCxcclxuICAgICAgICBCVUxMRVRUUkFOU0ZPUk0sXHJcbiAgICAgICAgQlVMTEVURElFLFxyXG4gICAgICAgIFNQQVdORU5FTVksXHJcbiAgICAgICAgRU5FTVlUUkFOU0ZPUk0sXHJcbiAgICAgICAgRU5USVRZQU5JTUFUSU9OU1RBVEUsXHJcbiAgICAgICAgRU5USVRZRElFLFxyXG4gICAgICAgIFNQQVdOSU5URVJOQUxJVEVNLFxyXG4gICAgICAgIFVQREFURUFUVFJJQlVURVMsXHJcbiAgICAgICAgVVBEQVRFV0VBUE9OLFxyXG4gICAgICAgIElURU1ESUUsXHJcbiAgICAgICAgU0VORFJPT00sXHJcbiAgICAgICAgU1dJVENIUk9PTVJFUVVFU1QsXHJcbiAgICAgICAgVVBEQVRFQlVGRixcclxuICAgICAgICBVUERBVEVVSSxcclxuICAgICAgICBTUFdBTk1JTklNQVAsXHJcbiAgICAgICAgU1BBV05aSVBaQVBcclxuICAgIH1cclxuXHJcbiAgICBpbXBvcnQgxpJDbGllbnQgPSBGdWRnZU5ldC5GdWRnZUNsaWVudDtcclxuXHJcbiAgICBleHBvcnQgbGV0IGNsaWVudDogxpJDbGllbnQ7XHJcbiAgICBleHBvcnQgbGV0IGNyZWF0ZWRSb29tOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGNsaWVudHM6IEFycmF5PHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfT4gPSBbXTtcclxuICAgIGV4cG9ydCBsZXQgcG9zVXBkYXRlOiDGki5WZWN0b3IzO1xyXG4gICAgZXhwb3J0IGxldCBzb21lb25lSXNIb3N0OiBib29sZWFuID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IGVuZW15OiBFbmVteS5FbmVteTtcclxuICAgIGV4cG9ydCBsZXQgY3VycmVudElEczogbnVtYmVyW10gPSBbXTtcclxuXHJcbiAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIkhvc3RTcGF3blwiKS5hZGRFdmVudExpc3RlbmVyKFwiY2xpY2tcIiwgKCkgPT4geyBzcGF3blBsYXllcigpIH0sIHRydWUpO1xyXG4gICAgbGV0IElQQ29ubmVjdGlvbiA9IDxIVE1MSW5wdXRFbGVtZW50PmRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiSVBDb25uZWN0aW9uXCIpO1xyXG4gICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJDb25uZWN0aW5nXCIpLmFkZEV2ZW50TGlzdGVuZXIoXCJjbGlja1wiLCBjb25uZWN0aW5nLCB0cnVlKTtcclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGNvbm5lY3RpbmcoKSB7XHJcbiAgICAgICAgY2xpZW50ID0gbmV3IMaSQ2xpZW50KCk7XHJcbiAgICAgICAgY2xpZW50LmFkZEV2ZW50TGlzdGVuZXIoRnVkZ2VOZXQuRVZFTlQuTUVTU0FHRV9SRUNFSVZFRCwgcmVjZWl2ZU1lc3NhZ2UpO1xyXG4gICAgICAgIGNsaWVudC5jb25uZWN0VG9TZXJ2ZXIoSVBDb25uZWN0aW9uLnZhbHVlKTtcclxuXHJcbiAgICAgICAgYWRkQ2xpZW50SUQoKVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBhZGRDbGllbnRJRCgpIHtcclxuICAgICAgICAgICAgaWYgKGNsaWVudC5pZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGxldCBvYmo6IHsgaWQ6IHN0cmluZywgcmVhZHk6IGJvb2xlYW4gfSA9IHsgaWQ6IGNsaWVudC5pZCwgcmVhZHk6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2gob2JqKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoYWRkQ2xpZW50SUQsIDMwMCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBhc3luYyBmdW5jdGlvbiByZWNlaXZlTWVzc2FnZShfZXZlbnQ6IEN1c3RvbUV2ZW50IHwgTWVzc2FnZUV2ZW50IHwgRXZlbnQpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgICAgICBpZiAoX2V2ZW50IGluc3RhbmNlb2YgTWVzc2FnZUV2ZW50KSB7XHJcbiAgICAgICAgICAgIGxldCBtZXNzYWdlOiBGdWRnZU5ldC5NZXNzYWdlID0gSlNPTi5wYXJzZShfZXZlbnQuZGF0YSk7XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5MT0FERUQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgR2FtZS5sb2FkZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBpZiAobWVzc2FnZS5pZFNvdXJjZSAhPSBjbGllbnQuaWQpIHtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9DUkVBVEUpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQucm9vbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGh0bWw6IEhUTUxFbGVtZW50ID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tSWRcIik7XHJcbiAgICAgICAgICAgICAgICAgICAgaHRtbC5wYXJlbnRFbGVtZW50LnN0eWxlLnZpc2liaWxpdHkgPSBcInZpc2libGVcIjtcclxuICAgICAgICAgICAgICAgICAgICBodG1sLnRleHRDb250ZW50ID0gbWVzc2FnZS5jb250ZW50LnJvb207XHJcbiAgICAgICAgICAgICAgICAgICAgY3JlYXRlZFJvb20gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGpvaW5Sb29tKG1lc3NhZ2UuY29udGVudC5yb29tKTtcclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9FTlRFUikge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChjcmVhdGVkUm9vbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjbGllbnQuYmVjb21lSG9zdCgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb21tYW5kID09IEZ1ZGdlTmV0LkNPTU1BTkQuUk9PTV9HRVRfSURTKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJIb3N0c2NyZWVuXCIpLnN0eWxlLnZpc2liaWxpdHkgIT0gXCJoaWRkZW5cIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbXM6IHN0cmluZ1tdID0gbWVzc2FnZS5jb250ZW50LnJvb21zO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcIlJvb21zXCIpLmlubmVySFRNTCA9IFwiXCI7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb29tcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Um9vbXM6IHN0cmluZ1tdID0gW107XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByb29tcy5mb3JFYWNoKHJvb20gPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChyb29tICE9IFwiTG9iYnlcIikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tcy5wdXNoKFwiPHA+XCIgKyByb29tICsgXCI8L3A+XCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJSb29tc1wiKS5pbm5lckhUTUwgPSBuZXdSb29tcy50b1N0cmluZygpLnJlcGxhY2VBbGwoXCIsXCIsIFwiXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHNldFRpbWVvdXQoKCkgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZ2V0Um9vbXMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSwgNTAwMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbW1hbmQgIT0gRnVkZ2VOZXQuQ09NTUFORC5TRVJWRVJfSEVBUlRCRUFUICYmIG1lc3NhZ2UuY29tbWFuZCAhPSBGdWRnZU5ldC5DT01NQU5ELkNMSUVOVF9IRUFSVEJFQVQpIHtcclxuICAgICAgICAgICAgICAgICAgICAvL0FkZCBuZXcgY2xpZW50IHRvIGFycmF5IGNsaWVudHNcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5DT05ORUNURUQudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50LnZhbHVlICE9IGNsaWVudC5pZCAmJiBjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50ID09IG1lc3NhZ2UuY29udGVudC52YWx1ZSkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCA9PSBtZXNzYWdlLmNvbnRlbnQudmFsdWUpID09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjbGllbnRzLnB1c2goeyBpZDogbWVzc2FnZS5jb250ZW50LnZhbHVlLCByZWFkeTogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFVEdBTUVTVEFURS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQucGxheWluZykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5wbGF5aW5nKGZhbHNlLCB0cnVlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfSBlbHNlIGlmICghbWVzc2FnZS5jb250ZW50LnBsYXlpbmcpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUucGF1c2UoZmFsc2UsIHRydWUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NQQVdOIE1JTklNQVAgQlkgQ0xJRU5UXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BXQU5NSU5JTUFQLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG9sZE1pbmlNYXBJbmZvID0gbWVzc2FnZS5jb250ZW50Lm1pbmlNYXBJbmZvcztcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld01pbmlNYXBJbmZvOiBJbnRlcmZhY2VzLklNaW5pbWFwSW5mb3NbXSA9IFtdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IG9sZE1pbmlNYXBJbmZvLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Q29vcmRzOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgR2FtZS7Gki5WZWN0b3IyKG9sZE1pbmlNYXBJbmZvW2ldLmNvb3Jkcy5kYXRhWzBdLCBvbGRNaW5pTWFwSW5mb1tpXS5jb29yZHMuZGF0YVsxXSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld01pbmlNYXBJbmZvLnB1c2goPEludGVyZmFjZXMuSU1pbmltYXBJbmZvcz57IGNvb3JkczogbmV3Q29vcmRzLCByb29tVHlwZTogb2xkTWluaU1hcEluZm9baV0ucm9vbVR5cGUgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5taW5pTWFwID0gbmV3IFVJLk1pbmltYXAobmV3TWluaU1hcEluZm8pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKEdhbWUubWluaU1hcCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL0ZST00gQ0xJRU5UIElOUFVUIFZFQ1RPUlMgRlJPTSBBVkFUQVJcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5DTElFTlRNT1ZFTUVOVC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dFZlY3RvciA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBpbnB1dDogSW50ZXJmYWNlcy5JSW5wdXRBdmF0YXJQYXlsb2FkID0geyB0aWNrOiBtZXNzYWdlLmNvbnRlbnQuaW5wdXQudGljaywgaW5wdXRWZWN0b3I6IGlucHV0VmVjdG9yLCBkb2VzQWJpbGl0eTogbWVzc2FnZS5jb250ZW50LmlucHV0LmRvZXNBYmlsaXR5IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5zZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyLnVwZGF0ZUVudGl0eVRvQ2hlY2sobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5zZXJ2ZXJQcmVkaWN0aW9uQXZhdGFyLm9uQ2xpZW50SW5wdXQoaW5wdXQpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gVE8gQ0xJRU5UIENBTENVTEFURUQgUE9TSVRJT04gRk9SIEFWQVRBUlxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNFUlZFUkJVRkZFUi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXRPYmo6IEludGVyZmFjZXMuSU5ldHdvcmtPYmplY3RzID0gR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZW50aXR5ID0+IGVudGl0eS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgcG9zaXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5idWZmZXIucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmJ1ZmZlci5wb3NpdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuYnVmZmVyLnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgc3RhdGU6IEludGVyZmFjZXMuSVN0YXRlUGF5bG9hZCA9IHsgdGljazogbWVzc2FnZS5jb250ZW50LmJ1ZmZlci50aWNrLCBwb3NpdGlvbjogcG9zaXRpb24gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldE9iaiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBvYmogPSBuZXRPYmoubmV0T2JqZWN0Tm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvYmogaW5zdGFuY2VvZiBQbGF5ZXIuUGxheWVyKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgKDxQbGF5ZXIuUGxheWVyPm9iaikuY2xpZW50Lm9uU2VydmVyTW92ZW1lbnRTdGF0ZShzdGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICg8QnVsbGV0cy5CdWxsZXQ+b2JqKS5jbGllbnRQcmVkaWN0aW9uLm9uU2VydmVyTW92ZW1lbnRTdGF0ZShzdGF0ZSk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIC8vRlJPTSBDTElFTlQgQlVMTEVUIFZFQ1RPUlNcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRQUkVESUNULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0VmVjdG9yID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuaW5wdXQuaW5wdXRWZWN0b3IuZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmlucHV0LmlucHV0VmVjdG9yLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5pbnB1dC5pbnB1dFZlY3Rvci5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGlucHV0OiBJbnRlcmZhY2VzLklJbnB1dEJ1bGxldFBheWxvYWQgPSB7IHRpY2s6IG1lc3NhZ2UuY29udGVudC5pbnB1dC50aWNrLCBpbnB1dFZlY3RvcjogaW5wdXRWZWN0b3IgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV0T2JqOiBJbnRlcmZhY2VzLklOZXR3b3JrT2JqZWN0cyA9IEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBsZXQgYnVsbGV0OiBCdWxsZXRzLkJ1bGxldDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG5ldE9iaiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IDxCdWxsZXRzLkJ1bGxldD5uZXRPYmoubmV0T2JqZWN0Tm9kZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGNvbnNvbGUubG9nKGJ1bGxldCArIFwiXCIgKyBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LnNlcnZlclByZWRpY3Rpb24udXBkYXRlRW50aXR5VG9DaGVjayhtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LnNlcnZlclByZWRpY3Rpb24ub25DbGllbnRJbnB1dChpbnB1dCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAvL1NldCBjbGllbnQgcmVhZHlcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TRVRSRUFEWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnRzLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50LmlkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBhdmF0YXIyIGFzIHJhbmdlZCBvciBtZWxlZSBcclxuICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTi50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXRJZDogbnVtYmVyID0gbWVzc2FnZS5jb250ZW50Lm5ldElkXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBhdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcyA9IG5ldyBFbnRpdHkuQXR0cmlidXRlcyhtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmF0dGFja1BvaW50cywgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuc3BlZWQsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLnNjYWxlLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5rbm9ja2JhY2tGb3JjZSwgbWVzc2FnZS5jb250ZW50LmF0dHJpYnV0ZXMuYXJtb3IsIG1lc3NhZ2UuY29udGVudC5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uLCBtZXNzYWdlLmNvbnRlbnQuYXR0cmlidXRlcy5hY2N1cmFjeSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQudHlwZSA9PSBFbnRpdHkuSUQuTUVMRUUpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMiA9IG5ldyBQbGF5ZXIuTWVsZWUoRW50aXR5LklELk1FTEVFLCBhdHRyaWJ1dGVzLCBuZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAobWVzc2FnZS5jb250ZW50LnR5cGUgPT0gRW50aXR5LklELlJBTkdFRCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyID0gbmV3IFBsYXllci5SYW5nZWQoRW50aXR5LklELlJBTkdFRCwgYXR0cmlidXRlcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgMCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKEdhbWUuYXZhdGFyMik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIC8vUnVudGltZSB1cGRhdGVzIGFuZCBjb21tdW5pY2F0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1N5bmMgYXZhdGFyMiBwb3NpdGlvbiBhbmQgcm90YXRpb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIGxldCB0ZXN0OiBHYW1lLsaSLlZlY3RvcjMgPSBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIC8vIGNvbnNvbGUubG9nKHRlc3QpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG1vdmVWZWN0b3I6IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnZhbHVlLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC52YWx1ZS5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQudmFsdWUuZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm90YXRlVmVjdG9yOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMl0pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmF2YXRhcjIgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbW92ZVZlY3RvcjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIubXR4TG9jYWwucm90YXRpb24gPSByb3RhdGVWZWN0b3I7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIyLmNvbGxpZGVyLnBvc2l0aW9uID0gbW92ZVZlY3Rvci50b1ZlY3RvcjIoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIEdhbWUuYXZhdGFyMi5hdmF0YXJQcmVkaWN0aW9uKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1VwZGF0ZSBpbnZlbnRvcnlcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFSU5WRU5UT1JZLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtOiBJdGVtcy5JdGVtO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEl0ZW1zLmdldEJ1ZmZJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaXRlbUlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbSA9IG5ldyBJdGVtcy5CdWZmSXRlbShtZXNzYWdlLmNvbnRlbnQuaXRlbUlkLCBtZXNzYWdlLmNvbnRlbnQuaXRlbU5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoSXRlbXMuZ2V0SW50ZXJuYWxJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaXRlbUlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0obWVzc2FnZS5jb250ZW50Lml0ZW1JZCwgbWVzc2FnZS5jb250ZW50Lml0ZW1OZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+ICg8UGxheWVyLlBsYXllcj5lbGVtKS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQuYWRkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5Lml0ZW1zLnB1c2gobmV3SXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5pdGVtcy5zcGxpY2UoZW50aXR5Lml0ZW1zLmluZGV4T2YoZW50aXR5Lml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IG5ld0l0ZW0uaWQpKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vQ2xpZW50IHJlcXVlc3QgZm9yIG1vdmUga25vY2tiYWNrXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLktOT0NLQkFDS1JFUVVFU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHBvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVuZW15OiBFbmVteS5FbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LmdldEtub2NrYmFjayhtZXNzYWdlLmNvbnRlbnQua25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9Ib3N0IHB1c2ggbW92ZSBrbm9ja2JhY2sgZnJvbSBlbmVteVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5LTk9DS0JBQ0tQVVNILnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0sIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzJdKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5hdmF0YXIxLmdldEtub2NrYmFjayhtZXNzYWdlLmNvbnRlbnQua25vY2tiYWNrRm9yY2UsIHBvc2l0aW9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TcGF3biBidWxsZXQgZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOQlVMTEVULnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQ6IEJ1bGxldHMuQnVsbGV0O1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eTogRW50aXR5LkVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm93bmVyTmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gZW50aXR5LndlYXBvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZGlyZWNpdG9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LmRpcmVjdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQuZGlyZWN0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAoPFdlYXBvbnMuQUlNPm1lc3NhZ2UuY29udGVudC5haW1UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgV2VhcG9ucy5BSU0uTk9STUFMOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0ID0gbmV3IEJ1bGxldHMuQnVsbGV0KHdlYXBvbi5idWxsZXRUeXBlLCBlbnRpdHkubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIGRpcmVjaXRvbiwgZW50aXR5Lm5ldElkLCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgV2VhcG9ucy5BSU0uSE9NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1bGxldFRhcmdldDogR2FtZS7Gki5WZWN0b3IzID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhtZXNzYWdlLmNvbnRlbnQuYnVsbGV0VGFyZ2V0LmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5idWxsZXRUYXJnZXQuZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LmJ1bGxldFRhcmdldC5kYXRhWzJdKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJ1bGxldCA9IG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldCh3ZWFwb24uYnVsbGV0VHlwZSwgZW50aXR5Lm10eExvY2FsLnRyYW5zbGF0aW9uLnRvVmVjdG9yMigpLCBkaXJlY2l0b24sIGVudGl0eS5uZXRJZCwgYnVsbGV0VGFyZ2V0LCBtZXNzYWdlLmNvbnRlbnQuYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuZ3JhcGguYWRkQ2hpbGQoYnVsbGV0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGJ1bGxldCB0cmFuc2Zvcm0gZnJvbSBob3N0IHRvIGNsaWVudFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChHYW1lLmN1cnJlbnROZXRPYmouZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKS5uZXRPYmplY3ROb2RlICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld1Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjMgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3Um90YXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvdGF0aW9uLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb3RhdGlvbi5kYXRhWzFdLCBtZXNzYWdlLmNvbnRlbnQucm90YXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIEdhbWUuY3VycmVudE5ldE9iai5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpLm5ldE9iamVjdE5vZGUubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5jdXJyZW50TmV0T2JqLmZpbmQoZWxlbWVudCA9PiBlbGVtZW50Lm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCkubmV0T2JqZWN0Tm9kZS5tdHhMb2NhbC5yb3RhdGlvbiA9IG5ld1JvdGF0aW9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBidWxsZXQgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uQlVMTEVURElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWxsZXQgPSBHYW1lLmJ1bGxldHMuZmluZChlbGVtZW50ID0+IGVsZW1lbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGJ1bGxldCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmxpZmV0aW1lID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnVsbGV0LmRlc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vU3Bhd24gZW5lbXkgYXQgdGhlIGNsaWVudCBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1BBV05FTkVNWS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBFbmVteVNwYXduZXIubmV0d29ya1NwYXduQnlJZChcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQuZW5lbXlDbGFzcyxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQuaWQsXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3IMaSLlZlY3RvcjIoXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSksXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbWVzc2FnZS5jb250ZW50Lm5ldElkLCBtZXNzYWdlLmNvbnRlbnQudGFyZ2V0KTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGVuZW15IHRyYW5zZm9ybSBmcm9tIGhvc3QgdG8gY2xpZW50XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbmVteSA9IEdhbWUuZW5lbWllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVuZW15ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMl0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVuZW15LnNldENvbGxpZGVyKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9TeW5jIGFuaW1hdGlvbiBzdGF0ZVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5FTlRJVFlBTklNQVRJT05TVEFURS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVuZW0gPT4gZW5lbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgaWYgKGVudGl0eSAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuc3dpdGNoQW5pbWF0aW9uKG1lc3NhZ2UuY29udGVudC5zdGF0ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vS2lsbCBlbnRpdHkgYXQgdGhlIGNsaWVudCBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uRU5USVRZRElFLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBlbnRpdHkgPSBHYW1lLmVudGl0aWVzLmZpbmQoZW5lbSA9PiBlbmVtLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoZW50aXR5ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5kaWUoKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3VwZGF0ZSBFbnRpdHkgYnVmZiBMaXN0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUJVRkYudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGJ1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSA9IDxCdWZmLkJ1ZmZbXT5tZXNzYWdlLmNvbnRlbnQuYnVmZkxpc3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgZW50aXR5ID0gR2FtZS5lbnRpdGllcy5maW5kKGVudCA9PiBlbnQubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChlbnRpdHkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmJ1ZmZzLmZvckVhY2gob2xkQnVmZiA9PiB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBidWZmVG9DaGVjayA9IGJ1ZmZMaXN0LmZpbmQoYnVmZiA9PiBidWZmLmlkID09IG9sZEJ1ZmYuaWQpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChidWZmVG9DaGVjayA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG9sZEJ1ZmYucmVtb3ZlQnVmZihlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgfSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBidWZmTGlzdC5mb3JFYWNoKGJ1ZmYgPT4ge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgbmV3QnVmZiA9IEJ1ZmYuZ2V0QnVmZkJ5SWQoYnVmZi5pZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld0J1ZmYudGlja1JhdGUgPSBidWZmLnRpY2tSYXRlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdCdWZmLmR1cmF0aW9uID0gYnVmZi5kdXJhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3QnVmZi5hZGRUb0VudGl0eShlbnRpdHkpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vdXBkYXRlIFVJXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURVVJLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBwb3NpdGlvbjogxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5wb3NpdGlvbi5kYXRhWzBdLCBtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVsxXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ldyBVSS5EYW1hZ2VVSShwb3NpdGlvbi50b1ZlY3RvcjMoKSwgbWVzc2FnZS5jb250ZW50LnZhbHVlKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vc3Bhd24gc3BlY2lhbCBpdGVtc1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAobWVzc2FnZS5jb250ZW50ICE9IHVuZGVmaW5lZCAmJiBtZXNzYWdlLmNvbnRlbnQudGV4dCA9PSBGVU5DVElPTi5TUEFXTlpJUFpBUC50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBpZiAoY2xpZW50LmlkICE9IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbTogQnVsbGV0cy5aaXBaYXBPYmplY3QgPSBuZXcgQnVsbGV0cy5aaXBaYXBPYmplY3QobWVzc2FnZS5jb250ZW50Lm93bmVyTmV0SWQsIG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgaXRlbS5zcGF3bigpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL1NwYXduIGl0ZW0gZnJvbSBob3N0XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChjbGllbnQuaWQgIT0gY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGlmIChJdGVtcy5nZXRCdWZmSXRlbUJ5SWQobWVzc2FnZS5jb250ZW50LmlkKSAhPSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdJdGVtID0gbmV3IEl0ZW1zLkJ1ZmZJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKG5ld0l0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoSXRlbXMuZ2V0SW50ZXJuYWxJdGVtQnlJZChtZXNzYWdlLmNvbnRlbnQuaWQpICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IG5ld0l0ZW0gPSBuZXcgSXRlbXMuSW50ZXJuYWxJdGVtKG1lc3NhZ2UuY29udGVudC5pZCwgbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3SXRlbS5zZXRQb3NpdGlvbihuZXcgxpIuVmVjdG9yMihtZXNzYWdlLmNvbnRlbnQucG9zaXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnBvc2l0aW9uLmRhdGFbMV0pKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChuZXdJdGVtKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vYXBwbHkgaXRlbSBhdHRyaWJ1dGVzXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChtZXNzYWdlLmNvbnRlbnQgIT0gdW5kZWZpbmVkICYmIG1lc3NhZ2UuY29udGVudC50ZXh0ID09IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGVudGl0eSA9IEdhbWUuZW50aXRpZXMuZmluZChlbGVtID0+IGVsZW0ubmV0SWQgPT0gbWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHN3aXRjaCAobWVzc2FnZS5jb250ZW50LnBheWxvYWQudHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuSEVBTFRIUE9JTlRTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5oZWFsdGhQb2ludHMgPSBtZXNzYWdlLmNvbnRlbnQucGF5bG9hZC52YWx1ZTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBFbnRpdHkuQVRUUklCVVRFVFlQRS5NQVhIRUFMVEhQT0lOVFM6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLm1heEhlYWx0aFBvaW50cyA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuS05PQ0tCQUNLRk9SQ0U6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmtub2NrYmFja0ZvcmNlID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuSElUQUJMRTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuaGl0YWJsZSA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkFSTU9SOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5hcm1vciA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLlNQRUVEOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBlbnRpdHkuYXR0cmlidXRlcy5zcGVlZCA9IG1lc3NhZ2UuY29udGVudC5wYXlsb2FkLnZhbHVlO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEVudGl0eS5BVFRSSUJVVEVUWVBFLkFUVEFDS1BPSU5UUzpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgZW50aXR5LmF0dHJpYnV0ZXMuYXR0YWNrUG9pbnRzID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuQ09PTERPV05SRURVQ1RJT046XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLmNvb2xEb3duUmVkdWN0aW9uID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgRW50aXR5LkFUVFJJQlVURVRZUEUuU0NBTEU6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS5hdHRyaWJ1dGVzLnNjYWxlID0gbWVzc2FnZS5jb250ZW50LnBheWxvYWQudmFsdWU7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGVudGl0eS51cGRhdGVTY2FsZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgLy9hcHBseSB3ZWFwb25cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uVVBEQVRFV0VBUE9OLnRvU3RyaW5nKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCByZWZXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gPFdlYXBvbnMuV2VhcG9uPm1lc3NhZ2UuY29udGVudC53ZWFwb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhtZXNzYWdlLmNvbnRlbnQud2VhcG9uLmNvb2xkb3duLmNvb2xEb3duKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNvbnN0IHRlbXBXZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKG1lc3NhZ2UuY29udGVudC53ZWFwb24uY29vbGRvd24uY29vbERvd24sIG1lc3NhZ2UuY29udGVudC53ZWFwb24uYXR0YWNrQ291bnQsIHJlZldlYXBvbi5idWxsZXRUeXBlLCByZWZXZWFwb24ucHJvamVjdGlsZUFtb3VudCwgcmVmV2VhcG9uLm93bmVyTmV0SWQsIHJlZldlYXBvbi5haW1UeXBlKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRlbXBXZWFwb24uY2FuU2hvb3QgPSByZWZXZWFwb24uY2FuU2hvb3Q7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAoPFBsYXllci5QbGF5ZXI+R2FtZS5lbnRpdGllcy5maW5kKGVsZW0gPT4gZWxlbS5uZXRJZCA9PSBtZXNzYWdlLmNvbnRlbnQubmV0SWQpKS53ZWFwb24gPSB0ZW1wV2VhcG9uO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL0tpbGwgaXRlbSBmcm9tIGhvc3RcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uSVRFTURJRS50b1N0cmluZygpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgaXRlbSA9IEdhbWUuZ3JhcGguZ2V0Q2hpbGRyZW4oKS5maW5kKGVuZW0gPT4gKDxJdGVtcy5JdGVtPmVuZW0pLm5ldElkID09IG1lc3NhZ2UuY29udGVudC5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLnJlbW92ZUNoaWxkKGl0ZW0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcG9wSUQobWVzc2FnZS5jb250ZW50Lm5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcm9vbSBcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU0VORFJPT00udG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IGNvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgR2FtZS7Gki5WZWN0b3IyKG1lc3NhZ2UuY29udGVudC5yb29tLmNvb3JkaW5hdGVzLmRhdGFbMF0sIG1lc3NhZ2UuY29udGVudC5yb29tLmNvb3JkaW5hdGVzLmRhdGFbMV0pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgbGV0IHRhbnNsYXRpb246IEdhbWUuxpIuVmVjdG9yMyA9IG5ldyBHYW1lLsaSLlZlY3RvcjMobWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVswXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsxXSwgbWVzc2FnZS5jb250ZW50LnJvb20udHJhbnNsYXRpb24uZGF0YVsyXSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBsZXQgcm9vbUluZm86IEludGVyZmFjZXMuSVJvb20gPSB7IGNvb3JkaW5hdGVzOiBjb29yZGlhbnRlcywgcm9vbVNpemU6IG1lc3NhZ2UuY29udGVudC5yb29tLnJvb21TaXplLCBleGl0czogbWVzc2FnZS5jb250ZW50LnJvb20uZXhpdHMsIHJvb21UeXBlOiBtZXNzYWdlLmNvbnRlbnQucm9vbS5yb29tVHlwZSwgdHJhbnNsYXRpb246IHRhbnNsYXRpb24gfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGxldCBuZXdSb29tOiBHZW5lcmF0aW9uLlJvb207XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHJvb21JbmZvLnJvb21UeXBlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlNUQVJUOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uU3RhcnRSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5OT1JNQUw6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20gPSBuZXcgR2VuZXJhdGlvbi5Ob3JtYWxSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5CT1NTOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uQm9zc1Jvb20ocm9vbUluZm8uY29vcmRpbmF0ZXMsIHJvb21JbmZvLnJvb21TaXplKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2FzZSBHZW5lcmF0aW9uLlJPT01UWVBFLlRSRUFTVVJFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uVHJlYXN1cmVSb29tKHJvb21JbmZvLmNvb3JkaW5hdGVzLCByb29tSW5mby5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgR2VuZXJhdGlvbi5ST09NVFlQRS5NRVJDSEFOVDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgbmV3Um9vbSA9IG5ldyBHZW5lcmF0aW9uLk1lcmNoYW50Um9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBjYXNlIEdlbmVyYXRpb24uUk9PTVRZUEUuQ0hBTExFTkdFOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBuZXdSb29tID0gbmV3IEdlbmVyYXRpb24uQ2hhbGxlbmdlUm9vbShyb29tSW5mby5jb29yZGluYXRlcywgcm9vbUluZm8ucm9vbVNpemUpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20uZXhpdHMgPSByb29tSW5mby5leGl0cztcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20ubXR4TG9jYWwudHJhbnNsYXRpb24gPSByb29tSW5mby50cmFuc2xhdGlvbjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20uc2V0U3Bhd25Qb2ludHMoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5ld1Jvb20ub3BlbkRvb3JzKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICBHZW5lcmF0aW9uLmFkZFJvb21Ub0dyYXBoKG5ld1Jvb20pO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAvL3NlbmQgcmVxdWVzdCB0byBzd2l0Y2ggcm9vbXNcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG1lc3NhZ2UuY29udGVudCAhPSB1bmRlZmluZWQgJiYgbWVzc2FnZS5jb250ZW50LnRleHQgPT0gRlVOQ1RJT04uU1dJVENIUk9PTVJFUVVFU1QudG9TdHJpbmcoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKG1lc3NhZ2UuY29udGVudC5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2V0Q2xpZW50UmVhZHkoKSB7XHJcbiAgICAgICAgY2xpZW50cy5maW5kKGVsZW1lbnQgPT4gZWxlbWVudC5pZCA9PSBjbGllbnQuaWQpLnJlYWR5ID0gdHJ1ZTtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TRVRSRUFEWSwgbmV0SWQ6IGNsaWVudC5pZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZXRHYW1lc3RhdGUoX3BsYXlpbmc6IGJvb2xlYW4pIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWQpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFVEdBTUVTVEFURSwgcGxheWluZzogX3BsYXlpbmcgfSB9KTtcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gY3JlYXRlUm9vbSgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuU0VSVkVSLCBjb21tYW5kOiBGdWRnZU5ldC5DT01NQU5ELlJPT01fQ1JFQVRFIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBqb2luUm9vbShfcm9vbUlkOiBzdHJpbmcpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuU0VSVkVSLCBjb21tYW5kOiBGdWRnZU5ldC5DT01NQU5ELlJPT01fRU5URVIsIGNvbnRlbnQ6IHsgcm9vbTogX3Jvb21JZCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXRSb29tcygpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuU0VSVkVSLCBjb21tYW5kOiBGdWRnZU5ldC5DT01NQU5ELlJPT01fR0VUX0lEUyB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyNyZWdpb24gcGxheWVyXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gbG9hZGVkKCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkxPQURFRCB9IH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzcGF3blBsYXllcigpIHtcclxuICAgICAgICBpZiAoR2FtZS5hdmF0YXIxLmlkID09IEVudGl0eS5JRC5NRUxFRSkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TUEFXTiwgdHlwZTogRW50aXR5LklELk1FTEVFLCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5WSUFfU0VSVkVSLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOLCB0eXBlOiBFbnRpdHkuSUQuUkFOR0VELCBhdHRyaWJ1dGVzOiBHYW1lLmF2YXRhcjEuYXR0cmlidXRlcywgcG9zaXRpb246IEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24sIG5ldElkOiBHYW1lLmF2YXRhcjEubmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNldENsaWVudCgpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuVklBX1NFUlZFUiwgY29udGVudDogeyB0ZXh0OiBOZXR3b3JraW5nLkZVTkNUSU9OLkNPTk5FQ1RFRCwgdmFsdWU6IE5ldHdvcmtpbmcuY2xpZW50LmlkIH0gfSk7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhclBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5UUkFOU0ZPUk0sIHZhbHVlOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24gfSB9KVxyXG4gICAgfVxyXG5cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc2VuZENsaWVudElucHV0KF9uZXRJZDogbnVtYmVyLCBfaW5wdXRQYXlsb2FkOiBJbnRlcmZhY2VzLklJbnB1dEF2YXRhclBheWxvYWQpIHtcclxuICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogRnVkZ2VOZXQuUk9VVEUuSE9TVCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5DTElFTlRNT1ZFTUVOVCwgbmV0SWQ6IF9uZXRJZCwgaW5wdXQ6IF9pbnB1dFBheWxvYWQgfSB9KVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kU2VydmVyQnVmZmVyKF9uZXRJZDogbnVtYmVyLCBfYnVmZmVyOiBJbnRlcmZhY2VzLklTdGF0ZVBheWxvYWQpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWRIb3N0ID09IE5ldHdvcmtpbmcuY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU0VSVkVSQlVGRkVSLCBuZXRJZDogX25ldElkLCBidWZmZXI6IF9idWZmZXIgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24ga25vY2tiYWNrUmVxdWVzdChfbmV0SWQ6IG51bWJlciwgX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudC5pZEhvc3QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uS05PQ0tCQUNLUkVRVUVTVCwgbmV0SWQ6IF9uZXRJZCwga25vY2tiYWNrRm9yY2U6IF9rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb246IF9wb3NpdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGtub2NrYmFja1B1c2goX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IzKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uS05PQ0tCQUNLUFVTSCwga25vY2tiYWNrRm9yY2U6IF9rbm9ja2JhY2tGb3JjZSwgcG9zaXRpb246IF9wb3NpdGlvbiB9IH0pXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUludmVudG9yeShfYWRkOiBib29sZWFuLCBfaXRlbUlkOiBJdGVtcy5JVEVNSUQsIF9pdGVtTmV0SWQ6IG51bWJlciwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkID09IGNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkKS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVJTlZFTlRPUlksIGFkZDogX2FkZCwgaXRlbUlkOiBfaXRlbUlkLCBpdGVtTmV0SWQ6IF9pdGVtTmV0SWQsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25NaW5pbWFwKF9taW5pTWFwSW5mb3M6IEludGVyZmFjZXMuSU1pbmltYXBJbmZvc1tdKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BXQU5NSU5JTUFQLCBtaW5pTWFwSW5mb3M6IF9taW5pTWFwSW5mb3MgfSB9KVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGJ1bGxldFxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduQnVsbGV0KF9haW1UeXBlOiBXZWFwb25zLkFJTSwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldE5ldElkOiBudW1iZXIsIF9vd25lck5ldElkOiBudW1iZXIsIF9idWxsZXRUYXJnZXQ/OiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05CVUxMRVQsIGFpbVR5cGU6IF9haW1UeXBlLCBkaXJlY3Rpb246IF9kaXJlY3Rpb24sIG93bmVyTmV0SWQ6IF9vd25lck5ldElkLCBidWxsZXROZXRJZDogX2J1bGxldE5ldElkLCBidWxsZXRUYXJnZXQ6IF9idWxsZXRUYXJnZXQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBzZW5kQnVsbGV0SW5wdXQoX25ldElkOiBudW1iZXIsIF9pbnB1dFBheWxvYWQ6IEludGVyZmFjZXMuSUlucHV0QnVsbGV0UGF5bG9hZCkge1xyXG4gICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkJVTExFVFBSRURJQ1QsIG5ldElkOiBfbmV0SWQsIGlucHV0OiBfaW5wdXRQYXlsb2FkIH0gfSlcclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVsbGV0KF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX3JvdGF0aW9uOiDGki5WZWN0b3IzLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5CVUxMRVRUUkFOU0ZPUk0sIHBvc2l0aW9uOiBfcG9zaXRpb24sIHJvdGF0aW9uOiBfcm90YXRpb24sIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVCdWxsZXQoX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uQlVMTEVURElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvLyNyZWdpb24gc3BlY2lhbEl0ZW1zXHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNwYXduWmlwWmFwKF9vd25lck5ldElkOiBudW1iZXIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOWklQWkFQLCBvd25lck5ldElkOiBfb3duZXJOZXRJZCwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8jZW5kcmVnaW9uXHJcblxyXG4gICAgLy8jcmVnaW9uIGVuZW15XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25FbmVteShfZW5lbXlDbGFzczogRW5lbXkuRU5FTVlDTEFTUywgX2VuZW15OiBFbmVteS5FbmVteSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uU1BBV05FTkVNWSwgZW5lbXlDbGFzczogX2VuZW15Q2xhc3MsIGlkOiBfZW5lbXkuaWQsIGF0dHJpYnV0ZXM6IF9lbmVteS5hdHRyaWJ1dGVzLCBwb3NpdGlvbjogX2VuZW15Lm10eExvY2FsLnRyYW5zbGF0aW9uLCBuZXRJZDogX25ldElkLCB0YXJnZXQ6IF9lbmVteS50YXJnZXQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBmdW5jdGlvbiB1cGRhdGVFbmVteVBvc2l0aW9uKF9wb3NpdGlvbjogxpIuVmVjdG9yMywgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoTmV0d29ya2luZy5jbGllbnQuaWQgPT0gTmV0d29ya2luZy5jbGllbnQuaWRIb3N0KSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLkVORU1ZVFJBTlNGT1JNLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlRW50aXR5QW5pbWF0aW9uU3RhdGUoX3N0YXRlOiBFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLCBfbmV0SWQ6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgPT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUsIHN0YXRlOiBfc3RhdGUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBlbHNlIHtcclxuICAgICAgICAvLyAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgPT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZQU5JTUFUSU9OU1RBVEUsIHN0YXRlOiBfc3RhdGUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG5cclxuICAgICAgICAvLyB9XHJcbiAgICB9XHJcbiAgICBleHBvcnQgZnVuY3Rpb24gcmVtb3ZlRW50aXR5KF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uRU5USVRZRElFLCBuZXRJZDogX25ldElkIH0gfSlcclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcblxyXG4gICAgLy8jcmVnaW9uIGl0ZW1zXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gc3Bhd25JdGVtKF9pZDogbnVtYmVyLCBfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNQQVdOSU5URVJOQUxJVEVNLCBpZDogX2lkLCBwb3NpdGlvbjogX3Bvc2l0aW9uLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUVudGl0eUF0dHJpYnV0ZXMoX2F0dHJpYnV0ZVBheWxvYWQ6IEludGVyZmFjZXMuSUF0dHJpYnV0ZVZhbHVlUGF5bG9hZCwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQVRUUklCVVRFUywgcGF5bG9hZDogX2F0dHJpYnV0ZVBheWxvYWQsIG5ldElkOiBfbmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURUFUVFJJQlVURVMsIHBheWxvYWQ6IF9hdHRyaWJ1dGVQYXlsb2FkLCBuZXRJZDogX25ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZUF2YXRhcldlYXBvbihfd2VhcG9uOiBXZWFwb25zLldlYXBvbiwgX3RhcmdldE5ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoY2xpZW50LmlkSG9zdCAhPSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IEZ1ZGdlTmV0LlJPVVRFLkhPU1QsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFV0VBUE9OLCB3ZWFwb246IF93ZWFwb24sIG5ldElkOiBfdGFyZ2V0TmV0SWQgfSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlVQREFURVdFQVBPTiwgd2VhcG9uOiBfd2VhcG9uLCBuZXRJZDogX3RhcmdldE5ldElkIH0gfSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiByZW1vdmVJdGVtKF9uZXRJZDogbnVtYmVyKSB7XHJcbiAgICAgICAgaWYgKGNsaWVudC5pZEhvc3QgIT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiBGdWRnZU5ldC5ST1VURS5IT1NULCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLklURU1ESUUsIG5ldElkOiBfbmV0SWQgfSB9KVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uSVRFTURJRSwgbmV0SWQ6IF9uZXRJZCB9IH0pXHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG4gICAgLy8jcmVnaW9uIGJ1ZmZzXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gdXBkYXRlQnVmZkxpc3QoX2J1ZmZMaXN0OiBCdWZmLkJ1ZmZbXSwgX25ldElkOiBudW1iZXIpIHtcclxuICAgICAgICBpZiAoR2FtZS5jb25uZWN0ZWQgJiYgY2xpZW50LmlkSG9zdCA9PSBjbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgY2xpZW50LmRpc3BhdGNoKHsgcm91dGU6IHVuZGVmaW5lZCwgaWRUYXJnZXQ6IGNsaWVudHMuZmluZChlbGVtID0+IGVsZW0uaWQgIT0gY2xpZW50LmlkSG9zdCkuaWQsIGNvbnRlbnQ6IHsgdGV4dDogRlVOQ1RJT04uVVBEQVRFQlVGRiwgYnVmZkxpc3Q6IF9idWZmTGlzdCwgbmV0SWQ6IF9uZXRJZCB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuICAgIC8vI3JlZ2lvbiBVSVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHVwZGF0ZVVJKF9wb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyLCBfdmFsdWU6IG51bWJlcikge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ID09IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50cy5maW5kKGVsZW0gPT4gZWxlbS5pZCAhPSBjbGllbnQuaWRIb3N0KS5pZCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5VUERBVEVVSSwgcG9zaXRpb246IF9wb3NpdGlvbiwgdmFsdWU6IF92YWx1ZSB9IH0pO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIC8vI2VuZHJlZ2lvblxyXG5cclxuXHJcbiAgICAvLyNyZWdpb24gcm9vbVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHNlbmRSb29tKF9yb29tOiBJbnRlcmZhY2VzLklSb29tKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY29ubmVjdGVkICYmIGNsaWVudC5pZEhvc3QgPT0gY2xpZW50LmlkKSB7XHJcbiAgICAgICAgICAgIGNsaWVudC5kaXNwYXRjaCh7IHJvdXRlOiB1bmRlZmluZWQsIGlkVGFyZ2V0OiBjbGllbnRzLmZpbmQoZWxlbSA9PiBlbGVtLmlkICE9IGNsaWVudC5pZEhvc3QpLmlkLCBjb250ZW50OiB7IHRleHQ6IEZVTkNUSU9OLlNFTkRST09NLCByb29tOiBfcm9vbSB9IH0pXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb21SZXF1ZXN0KF9kaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cykge1xyXG4gICAgICAgIGlmIChHYW1lLmNvbm5lY3RlZCAmJiBjbGllbnQuaWRIb3N0ICE9IGNsaWVudC5pZCkge1xyXG4gICAgICAgICAgICBjbGllbnQuZGlzcGF0Y2goeyByb3V0ZTogdW5kZWZpbmVkLCBpZFRhcmdldDogY2xpZW50LmlkSG9zdCwgY29udGVudDogeyB0ZXh0OiBGVU5DVElPTi5TV0lUQ0hST09NUkVRVUVTVCwgZGlyZWN0aW9uOiBfZGlyZWN0aW9uIH0gfSlcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvLyNlbmRyZWdpb25cclxuXHJcbiAgICAvKipcclxuICAgICAqIGdlbmVyYXRlcyBpbmRpdmlkdWFsIElEcyBvbiBIb3N0IHdpdGhvdXQgZHVwbGljYXRlcyByZXR1cm5zIHRoZSBnaXZlbiBOZXRJZFxyXG4gICAgICogQHBhcmFtIF9uZXRJZCBpZiB1bmRlZmluZWQgZ2VuZXJhdGVzIGEgbmV3IE5ldElkIC0+IG9ubHkgdW5kZWZpbmVkIG9uIEhvc3RcclxuICAgICAqIEByZXR1cm5zIGEgbmV3IG5ldElkIG9yIHRoZSBuZXRJZCBwcm92aWRlZCBieSB0aGUgaG9zdFxyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gSWRNYW5hZ2VyKF9uZXRJZDogbnVtYmVyKTogbnVtYmVyIHtcclxuICAgICAgICBpZiAoX25ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjdXJyZW50SURzLnB1c2goX25ldElkKTtcclxuICAgICAgICAgICAgcmV0dXJuIF9uZXRJZDtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBnZW5lcmF0ZU5ld0lkKCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlTmV3SWQoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgbmV3SWQ6IG51bWJlcjtcclxuICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBuZXdJZCA9IGlkR2VuZXJhdG9yKCk7XHJcbiAgICAgICAgICAgIGlmIChjdXJyZW50SURzLmZpbmQoaWQgPT4gaWQgPT0gbmV3SWQpID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgY3VycmVudElEcy5wdXNoKG5ld0lkKTtcclxuICAgICAgICByZXR1cm4gbmV3SWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaWRHZW5lcmF0b3IoKTogbnVtYmVyIHtcclxuICAgICAgICBsZXQgaWQgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAxMDAwKTtcclxuICAgICAgICByZXR1cm4gaWQ7XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHBvcElEKF9pZDogbnVtYmVyKSB7XHJcbiAgICAgICAgY3VycmVudElEcy5zcGxpY2UoY3VycmVudElEcy5pbmRleE9mKF9pZCksIDEpO1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBpc05ldHdvcmtPYmplY3QoX29iamVjdDogYW55KTogX29iamVjdCBpcyBJbnRlcmZhY2VzLklOZXR3b3JrYWJsZSB7XHJcbiAgICAgICAgcmV0dXJuIFwibmV0SWRcIiBpbiBfb2JqZWN0O1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBnZXROZXRJZChfb2JqZWN0OiBHYW1lLsaSLk5vZGUpOiBudW1iZXIge1xyXG4gICAgICAgIGlmIChpc05ldHdvcmtPYmplY3QoX29iamVjdCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIF9vYmplY3QubmV0SWQ7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG5cclxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKFwiYmVmb3JldW5sb2FkXCIsIG9uVW5sb2FkLCBmYWxzZSk7XHJcblxyXG4gICAgZnVuY3Rpb24gb25VbmxvYWQoKSB7XHJcbiAgICAgICAgLy9UT0RPOiBUaGluZ3Mgd2UgZG8gYWZ0ZXIgdGhlIHBsYXllciBsZWZ0IHRoZSBnYW1lXHJcbiAgICB9XHJcbn0iLCJuYW1lc3BhY2UgUGxheWVyIHtcclxuXHJcbiAgICBleHBvcnQgYWJzdHJhY3QgY2xhc3MgUGxheWVyIGV4dGVuZHMgRW50aXR5LkVudGl0eSB7XHJcbiAgICAgICAgcHVibGljIHdlYXBvbjogV2VhcG9ucy5XZWFwb24gPSBuZXcgV2VhcG9ucy5XZWFwb24oMjUsIDEsIEJ1bGxldHMuQlVMTEVUVFlQRS5TVEFOREFSRCwgMSwgdGhpcy5uZXRJZCwgV2VhcG9ucy5BSU0uTk9STUFMKTtcclxuXHJcbiAgICAgICAgcHVibGljIGNsaWVudDogTmV0d29ya2luZy5DbGllbnRQcmVkaWN0aW9uO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb3VudDogbnVtYmVyID0gMTtcclxuICAgICAgICBjdXJyZW50YWJpbGl0eUNvdW50OiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb3VudDtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2lkOiBFbnRpdHkuSUQsIF9hdHRyaWJ1dGVzOiBFbnRpdHkuQXR0cmlidXRlcywgX25ldElkPzogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9pZCwgX25ldElkKTtcclxuICAgICAgICAgICAgdGhpcy5hdHRyaWJ1dGVzID0gX2F0dHJpYnV0ZXM7XHJcbiAgICAgICAgICAgIHRoaXMudGFnID0gVGFnLlRBRy5QTEFZRVI7XHJcbiAgICAgICAgICAgIHRoaXMuY2xpZW50ID0gbmV3IE5ldHdvcmtpbmcuQ2xpZW50UHJlZGljdGlvbih0aGlzLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBtb3ZlKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMpIHtcclxuXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm1hZ25pdHVkZSA+IDApIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN3aXRjaEFuaW1hdGlvbihFbnRpdHkuQU5JTUFUSU9OU1RBVEVTLldBTEspO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2UgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID09IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3dpdGNoQW5pbWF0aW9uKEVudGl0eS5BTklNQVRJT05TVEFURVMuSURMRSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2V0Q29sbGlkZXIoKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuc2NhbGVNb3ZlVmVjdG9yKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLmFkZChfZGlyZWN0aW9uKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29sbGlkZSh0aGlzLm1vdmVEaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tb3ZlRGlyZWN0aW9uLnN1YnRyYWN0KF9kaXJlY3Rpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9wZW5Eb29yKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgd2FsbHM6IEdlbmVyYXRpb24uV2FsbFtdID0gKDxHZW5lcmF0aW9uLldhbGxbXT5HYW1lLmN1cnJlbnRSb29tLmdldENoaWxkcmVuKCkpO1xyXG4gICAgICAgICAgICB3YWxscy5mb3JFYWNoKCh3YWxsKSA9PiB7XHJcbiAgICAgICAgICAgICAgICBpZiAod2FsbC5kb29yICE9IHVuZGVmaW5lZCAmJiB3YWxsLmRvb3IuaXNBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jb2xsaWRlci5jb2xsaWRlc1JlY3Qod2FsbC5kb29yLmNvbGxpZGVyKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uRG9vcj53YWxsLmRvb3IpLmNoYW5nZVJvb20oKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHNjYWxlTW92ZVZlY3RvcihfZGlyZWN0aW9uOiBHYW1lLsaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCAmJiB0aGlzID09IEdhbWUuYXZhdGFyMSkge1xyXG4gICAgICAgICAgICAgICAgX2RpcmVjdGlvbi5zY2FsZSgoR2FtZS5kZWx0YVRpbWUgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24uc2NhbGUoKHRoaXMuY2xpZW50Lm1pblRpbWVCZXR3ZWVuVGlja3MgKiB0aGlzLmF0dHJpYnV0ZXMuc3BlZWQpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHByZWRpY3QoKSB7XHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QgIT0gTmV0d29ya2luZy5jbGllbnQuaWQpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY2xpZW50LnVwZGF0ZSgpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5tb3ZlKElucHV0U3lzdGVtLm1vdmUoKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlKF9kaXJlY3Rpb246IEdhbWUuxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5jb2xsaWRlKF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5nZXRJdGVtQ29sbGlzaW9uKCk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGxldCBlbmVtaWVzOiBFbmVteS5FbmVteVtdID0gR2FtZS5lbmVtaWVzO1xyXG4gICAgICAgICAgICBsZXQgZW5lbWllc0NvbGxpZGVyOiBDb2xsaWRlci5Db2xsaWRlcltdID0gW107XHJcbiAgICAgICAgICAgIGVuZW1pZXMuZm9yRWFjaChlbGVtZW50ID0+IHtcclxuICAgICAgICAgICAgICAgIGVuZW1pZXNDb2xsaWRlci5wdXNoKGVsZW1lbnQuY29sbGlkZXIpO1xyXG4gICAgICAgICAgICB9KVxyXG5cclxuICAgICAgICAgICAgLy9UT0RPOiB1bmNvbW1lbnRcclxuICAgICAgICAgICAgLy8gdGhpcy5jYWxjdWxhdGVDb2xsaWRlcihlbmVtaWVzQ29sbGlkZXIsIF9kaXJlY3Rpb24pO1xyXG5cclxuICAgICAgICAgICAgaWYgKHRoaXMuY2FuTW92ZVggJiYgdGhpcy5jYW5Nb3ZlWSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9IGVsc2UgaWYgKHRoaXMuY2FuTW92ZVggJiYgIXRoaXMuY2FuTW92ZVkpIHtcclxuICAgICAgICAgICAgICAgIF9kaXJlY3Rpb24gPSBuZXcgxpIuVmVjdG9yMyhfZGlyZWN0aW9uLngsIDAsIF9kaXJlY3Rpb24ueilcclxuICAgICAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0ZShfZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIGlmICghdGhpcy5jYW5Nb3ZlWCAmJiB0aGlzLmNhbk1vdmVZKSB7XHJcbiAgICAgICAgICAgICAgICBfZGlyZWN0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgX2RpcmVjdGlvbi55LCBfZGlyZWN0aW9uLnopXHJcbiAgICAgICAgICAgICAgICB0aGlzLmNtcFRyYW5zZm9ybS5tdHhMb2NhbC50cmFuc2xhdGUoX2RpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIGdldEl0ZW1Db2xsaXNpb24oKSB7XHJcbiAgICAgICAgICAgIGxldCBpdGVtQ29sbGlkZXI6IEl0ZW1zLkl0ZW1bXSA9IEdhbWUuaXRlbXM7XHJcbiAgICAgICAgICAgIGl0ZW1Db2xsaWRlci5mb3JFYWNoKGl0ZW0gPT4ge1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMuY29sbGlkZXIuY29sbGlkZXMoaXRlbS5jb2xsaWRlcikpIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5JbnRlcm5hbEl0ZW0gJiYgKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuY2hvb3Nlbk9uZU5ldElkICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoKDxJdGVtcy5JbnRlcm5hbEl0ZW0+aXRlbSkuY2hvb3Nlbk9uZU5ldElkICE9IHRoaXMubmV0SWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20ucm9vbVR5cGUgPT0gR2VuZXJhdGlvbi5ST09NVFlQRS5UUkVBU1VSRSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAoPEdlbmVyYXRpb24uVHJlYXN1cmVSb29tPkdhbWUuY3VycmVudFJvb20pLm9uSXRlbUNvbGxlY3QoaXRlbSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoR2FtZS5jdXJyZW50Um9vbS5yb29tVHlwZSA9PSBHZW5lcmF0aW9uLlJPT01UWVBFLk1FUkNIQU5UKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKDxHZW5lcmF0aW9uLk1lcmNoYW50Um9vbT5HYW1lLmN1cnJlbnRSb29tKS5vbkl0ZW1Db2xsZWN0KGl0ZW0sIHRoaXMpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KHRydWUsIGl0ZW0uaWQsIGl0ZW0ubmV0SWQsIHRoaXMubmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uYWRkSXRlbVRvRW50aXR5KHRoaXMpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXRlbSBpbnN0YW5jZW9mIEl0ZW1zLkludGVybmFsSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArICg8SXRlbXMuSW50ZXJuYWxJdGVtPml0ZW0pLnZhbHVlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKGl0ZW0gaW5zdGFuY2VvZiBJdGVtcy5CdWZmSXRlbSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmxvZyhpdGVtLm5hbWUgKyBcIjogXCIgKyBpdGVtLmRlc2NyaXB0aW9uICsgXCIgc210aCBjaGFuZ2VkIHRvOiBcIiArIEJ1ZmYuQlVGRklEWyg8SXRlbXMuQnVmZkl0ZW0+aXRlbSkuYnVmZlswXS5pZF0udG9TdHJpbmcoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcblxyXG4gICAgICAgIHB1YmxpYyBhdHRhY2soX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX25ldElkPzogbnVtYmVyLCBfc3luYz86IGJvb2xlYW4pIHtcclxuICAgICAgICAgICAgdGhpcy53ZWFwb24uc2hvb3QodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi50b1ZlY3RvcjIoKSwgX2RpcmVjdGlvbiwgX25ldElkLCBfc3luYyk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgZG9Lbm9ja2JhY2soX2JvZHk6IEVudGl0eS5FbnRpdHkpOiB2b2lkIHtcclxuICAgICAgICAgICAgLy8gKDxFbmVteS5FbmVteT5fYm9keSkuZ2V0S25vY2tiYWNrKHRoaXMua25vY2tiYWNrRm9yY2UsIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlOiBudW1iZXIsIF9wb3NpdGlvbjogxpIuVmVjdG9yMyk6IHZvaWQge1xyXG4gICAgICAgICAgICBzdXBlci5nZXRLbm9ja2JhY2soX2tub2NrYmFja0ZvcmNlLCBfcG9zaXRpb24pO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIGRvQWJpbGl0eSgpIHtcclxuXHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBNZWxlZSBleHRlbmRzIFBsYXllciB7XHJcbiAgICAgICAgcHVibGljIGJsb2NrOiBBYmlsaXR5LkJsb2NrID0gbmV3IEFiaWxpdHkuQmxvY2sodGhpcy5uZXRJZCwgNjAwLCAxLCA1ICogNjApO1xyXG4gICAgICAgIHJlYWRvbmx5IGFiaWxpdHlDb29sZG93blRpbWU6IG51bWJlciA9IDQwO1xyXG4gICAgICAgIGN1cnJlbnRhYmlsaXR5Q29vbGRvd25UaW1lOiBudW1iZXIgPSB0aGlzLmFiaWxpdHlDb29sZG93blRpbWU7XHJcblxyXG4gICAgICAgIHB1YmxpYyB3ZWFwb246IFdlYXBvbnMuV2VhcG9uID0gbmV3IFdlYXBvbnMuV2VhcG9uKDEyLCAxLCBCdWxsZXRzLkJVTExFVFRZUEUuTUVMRUUsIDEsIHRoaXMubmV0SWQsIFdlYXBvbnMuQUlNLk5PUk1BTCk7XHJcblxyXG5cclxuICAgICAgICBwdWJsaWMgYXR0YWNrKF9kaXJlY3Rpb246IMaSLlZlY3RvcjMsIF9uZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIHRoaXMud2VhcG9uLnNob290KHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIF9kaXJlY3Rpb24sIF9uZXRJZCwgX3N5bmMpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgLy9CbG9ja1xyXG4gICAgICAgIHB1YmxpYyBkb0FiaWxpdHkoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIGV4cG9ydCBjbGFzcyBSYW5nZWQgZXh0ZW5kcyBQbGF5ZXIge1xyXG5cclxuICAgICAgICBwdWJsaWMgZGFzaDogQWJpbGl0eS5EYXNoID0gbmV3IEFiaWxpdHkuRGFzaCh0aGlzLm5ldElkLCA4LCAxLCA2MCwgNSk7XHJcbiAgICAgICAgcGVyZm9ybUFiaWxpdHk6IGJvb2xlYW4gPSBmYWxzZTtcclxuICAgICAgICBsYXN0TW92ZURpcmVjdGlvbjogR2FtZS7Gki5WZWN0b3IzO1xyXG5cclxuICAgICAgICBwdWJsaWMgbW92ZShfZGlyZWN0aW9uOiDGki5WZWN0b3IzKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmRhc2guZG9lc0FiaWxpdHkpIHtcclxuICAgICAgICAgICAgICAgIHN1cGVyLm1vdmUodGhpcy5sYXN0TW92ZURpcmVjdGlvbik7XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBzdXBlci5tb3ZlKF9kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24ubWFnbml0dWRlID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubGFzdE1vdmVEaXJlY3Rpb24gPSBfZGlyZWN0aW9uO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICAvL0Rhc2hcclxuICAgICAgICBwdWJsaWMgZG9BYmlsaXR5KCkge1xyXG4gICAgICAgICAgICB0aGlzLmRhc2guZG9BYmlsaXR5KCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG4gICAgZXhwb3J0IGVudW0gUk9PTVRZUEUge1xyXG4gICAgICAgIFNUQVJULFxyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBNRVJDSEFOVCxcclxuICAgICAgICBUUkVBU1VSRSxcclxuICAgICAgICBDSEFMTEVOR0UsXHJcbiAgICAgICAgQk9TU1xyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBFbmVteUNvdW50TWFuYWdlciB7XHJcbiAgICAgICAgcHJpdmF0ZSBtYXhFbmVteUNvdW50OiBudW1iZXI7IGdldCBnZXRNYXhFbmVteUNvdW50KCk6IG51bWJlciB7IHJldHVybiB0aGlzLm1heEVuZW15Q291bnQgfTtcclxuICAgICAgICBwcml2YXRlIGN1cnJlbnRFbmVteUNvb3VudDogbnVtYmVyO1xyXG4gICAgICAgIHB1YmxpYyBmaW5pc2hlZDogYm9vbGVhbjtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfZW5lbXlDb3VudDogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHRoaXMubWF4RW5lbXlDb3VudCA9IF9lbmVteUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmN1cnJlbnRFbmVteUNvb3VudCA9IF9lbmVteUNvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgIGlmIChfZW5lbXlDb3VudCA8PSAwKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmZpbmlzaGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uRW5lbXlEZWF0aCgpIHtcclxuICAgICAgICAgICAgdGhpcy5jdXJyZW50RW5lbXlDb291bnQtLTtcclxuICAgICAgICAgICAgaWYgKHRoaXMuY3VycmVudEVuZW15Q29vdW50IDw9IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZmluaXNoZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGxldCB0eHRTdGFydFJvb206IEdhbWUuxpIuVGV4dHVyZUltYWdlID0gbmV3IEdhbWUuxpIuVGV4dHVyZUltYWdlKCk7XHJcblxyXG4gICAgZXhwb3J0IGFic3RyYWN0IGNsYXNzIFJvb20gZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHO1xyXG4gICAgICAgIHB1YmxpYyByb29tVHlwZTogUk9PTVRZUEU7XHJcbiAgICAgICAgcHVibGljIGNvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjI7XHJcbiAgICAgICAgcHVibGljIHdhbGxzOiBXYWxsW10gPSBbXTtcclxuICAgICAgICBwdWJsaWMgb2JzdGljYWxzOiBPYnNpdGNhbFtdID0gW107XHJcbiAgICAgICAgcHVibGljIGVuZW15Q291bnRNYW5hZ2VyOiBFbmVteUNvdW50TWFuYWdlcjtcclxuICAgICAgICBwdWJsaWMgcG9zaXRpb25VcGRhdGVkOiBib29sZWFuID0gZmFsc2U7XHJcbiAgICAgICAgcm9vbVNpemU6IG51bWJlciA9IDMwO1xyXG4gICAgICAgIGV4aXRzOiBJbnRlcmZhY2VzLklSb29tRXhpdHM7IC8vIE4gRSBTIFdcclxuICAgICAgICBtZXNoOiDGki5NZXNoUXVhZCA9IG5ldyDGki5NZXNoUXVhZDtcclxuICAgICAgICBjbXBNZXNoOiDGki5Db21wb25lbnRNZXNoID0gbmV3IMaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludE46IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnROKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnROIH07XHJcbiAgICAgICAgcHJvdGVjdGVkIGF2YXRhclNwYXduUG9pbnRFOiBHYW1lLsaSLlZlY3RvcjI7IGdldCBnZXRTcGF3blBvaW50RSgpOiBHYW1lLsaSLlZlY3RvcjIgeyByZXR1cm4gdGhpcy5hdmF0YXJTcGF3blBvaW50RSB9O1xyXG4gICAgICAgIHByb3RlY3RlZCBhdmF0YXJTcGF3blBvaW50UzogR2FtZS7Gki5WZWN0b3IyOyBnZXQgZ2V0U3Bhd25Qb2ludFMoKTogR2FtZS7Gki5WZWN0b3IyIHsgcmV0dXJuIHRoaXMuYXZhdGFyU3Bhd25Qb2ludFMgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXZhdGFyU3Bhd25Qb2ludFc6IEdhbWUuxpIuVmVjdG9yMjsgZ2V0IGdldFNwYXduUG9pbnRXKCk6IEdhbWUuxpIuVmVjdG9yMiB7IHJldHVybiB0aGlzLmF2YXRhclNwYXduUG9pbnRXIH07XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwoKTtcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaWFudGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyLCBfcm9vbVR5cGU6IFJPT01UWVBFKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwicm9vbVwiKTtcclxuICAgICAgICAgICAgdGhpcy50YWcgPSBUYWcuVEFHLlJPT007XHJcbiAgICAgICAgICAgIHRoaXMuY29vcmRpbmF0ZXMgPSBfY29vcmRpYW50ZXM7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoMCk7XHJcbiAgICAgICAgICAgIGlmIChfcm9vbVNpemUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21TaXplID0gX3Jvb21TaXplO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfcm9vbVR5cGUgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJvb21UeXBlID0gX3Jvb21UeXBlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuZXhpdHMgPSA8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgxpIuVmVjdG9yMyh0aGlzLnJvb21TaXplLCB0aGlzLnJvb21TaXplLCAxKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNZXNoKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQodGhpcy5jbXBNYXRlcmlhbCk7XHJcbiAgICAgICAgICAgIHRoaXMuY21wVHJhbnNmb3JtLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgLTAuMDEpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRXYWxscygpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZEV2ZW50TGlzdGVuZXIoR2FtZS7Gki5FVkVOVC5SRU5ERVJfUFJFUEFSRSwgdGhpcy5ldmVudFVwZGF0ZSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBldmVudFVwZGF0ZSA9IChfZXZlbnQ6IEV2ZW50KTogdm9pZCA9PiB7XHJcbiAgICAgICAgICAgIHRoaXMudXBkYXRlKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHB1YmxpYyBvbkFkZFRvR3JhcGgoKSB7XHJcblxyXG4gICAgICAgIH1cclxuICAgICAgICBwdWJsaWMgdXBkYXRlKCk6IHZvaWQge1xyXG5cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgYWRkV2FsbHMoKTogdm9pZCB7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKDAuNSwgMCksIG5ldyDGki5WZWN0b3IyKDEgLyB0aGlzLnJvb21TaXplLCAxICsgMSAvIHRoaXMucm9vbVNpemUpLCB0aGlzKSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKChuZXcgV2FsbChuZXcgxpIuVmVjdG9yMigwLCAwLjUpLCBuZXcgxpIuVmVjdG9yMigxLCAxIC8gdGhpcy5yb29tU2l6ZSksIHRoaXMpKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ2hpbGQoKG5ldyBXYWxsKG5ldyDGki5WZWN0b3IyKC0wLjUsIDApLCBuZXcgxpIuVmVjdG9yMigxIC8gdGhpcy5yb29tU2l6ZSwgMSArIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDaGlsZCgobmV3IFdhbGwobmV3IMaSLlZlY3RvcjIoMCwgLTAuNSksIG5ldyDGki5WZWN0b3IyKDEsIDEgLyB0aGlzLnJvb21TaXplKSwgdGhpcykpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q2hpbGRyZW4oKS5maWx0ZXIoZWxlbSA9PiAoPFdhbGw+ZWxlbSkudGFnID09IFRhZy5UQUcuV0FMTCkuZm9yRWFjaCh3YWxsID0+IHtcclxuICAgICAgICAgICAgICAgIHRoaXMud2FsbHMucHVzaCgoPFdhbGw+d2FsbCkpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHNldFNwYXduUG9pbnRzKCkge1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnRFID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgKCh0aGlzLnJvb21TaXplIC8gMikgLSAyKSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55KTtcclxuICAgICAgICAgICAgdGhpcy5hdmF0YXJTcGF3blBvaW50VyA9IG5ldyDGki5WZWN0b3IyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueCAtICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMiksIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSk7XHJcbiAgICAgICAgICAgIHRoaXMuYXZhdGFyU3Bhd25Qb2ludE4gPSBuZXcgxpIuVmVjdG9yMih0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLngsIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24ueSArICgodGhpcy5yb29tU2l6ZSAvIDIpIC0gMikpO1xyXG4gICAgICAgICAgICB0aGlzLmF2YXRhclNwYXduUG9pbnRTID0gbmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54LCB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uLnkgLSAoKHRoaXMucm9vbVNpemUgLyAyKSAtIDIpKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBnZXRSb29tU2l6ZSgpOiBudW1iZXIge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5yb29tU2l6ZTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzZXRSb29tRXhpdChfbmVpZ2hib3VyOiBSb29tKSB7XHJcbiAgICAgICAgICAgIGxldCBkaWYgPSBHYW1lLsaSLlZlY3RvcjIuRElGRkVSRU5DRShfbmVpZ2hib3VyLmNvb3JkaW5hdGVzLCB0aGlzLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlTm9ydGgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLm5vcnRoID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoZGlmLmVxdWFscyhjb21wYXJlRWFzdCkpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZXhpdHMuZWFzdCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZVNvdXRoKSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5leGl0cy5zb3V0aCA9IHRydWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKGRpZi5lcXVhbHMoY29tcGFyZVdlc3QpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmV4aXRzLndlc3QgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb3BlbkRvb3JzKCkge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5ub3J0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5ub3J0aCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMuZWFzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5lYXN0ID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodGhpcy5leGl0cy5zb3V0aCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi5zb3V0aCA9PSB0cnVlKS5kb29yLm9wZW5Eb29yKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRoaXMuZXhpdHMud2VzdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy53YWxscy5maW5kKHdhbGwgPT4gd2FsbC5kb29yLmRpcmVjdGlvbi53ZXN0ID09IHRydWUpLmRvb3Iub3BlbkRvb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFN0YXJ0Um9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgc3RhcnRSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U3RhcnRSb29tKSk7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5TVEFSVCk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuc3RhcnRSb29tTWF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTm9ybWFsUm9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIG5vcm1hbFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibm9ybWFsUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuTk9STUFMKTtcclxuICAgICAgICAgICAgdGhpcy5lbmVteUNvdW50TWFuYWdlciA9IG5ldyBFbmVteUNvdW50TWFuYWdlcig1KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5ub3JtYWxSb29tTWF0O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgQm9zc1Jvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBib3NzUm9vbU1hdDogxpIuTWF0ZXJpYWwgPSBuZXcgxpIuTWF0ZXJpYWwoXCJib3NzUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJibGFja1wiKSkpO1xyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9jb29yZGluYXRlczogR2FtZS7Gki5WZWN0b3IyLCBfcm9vbVNpemU6IG51bWJlcikge1xyXG4gICAgICAgICAgICBzdXBlcihfY29vcmRpbmF0ZXMsIF9yb29tU2l6ZSwgUk9PTVRZUEUuQk9TUyk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5ib3NzUm9vbU1hdDtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIFRyZWFzdXJlUm9vbSBleHRlbmRzIFJvb20ge1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInRyZWFzdXJlUm9vbU1hdFwiLCDGki5TaGFkZXJGbGF0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJ5ZWxsb3dcIikpKTtcclxuICAgICAgICBwcml2YXRlIHNwYXduQ2hhbmNlOiBudW1iZXIgPSAyNTsgZ2V0IGdldFNwYXduQ2hhbmNlKCk6IG51bWJlciB7IHJldHVybiB0aGlzLnNwYXduQ2hhbmNlIH07XHJcbiAgICAgICAgcHJpdmF0ZSB0cmVhc3VyZUNvdW50OiBudW1iZXIgPSAyO1xyXG4gICAgICAgIHByaXZhdGUgdHJlYXN1cmVzOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLlRSRUFTVVJFKTtcclxuICAgICAgICAgICAgdGhpcy5nZXRDb21wb25lbnQoR2FtZS7Gki5Db21wb25lbnRNYXRlcmlhbCkubWF0ZXJpYWwgPSB0aGlzLnRyZWFzdXJlUm9vbU1hdDtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVUcmVhc3VyZXMoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJpdmF0ZSBjcmVhdGVUcmVhc3VyZXMoKSB7XHJcbiAgICAgICAgICAgIGxldCB0cmVhc3VyZXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMudHJlYXN1cmVDb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICB0cmVhc3VyZXMucHVzaChJdGVtcy5JdGVtR2VuZXJhdG9yLmdldFJhbmRvbUl0ZW0oKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMgPSB0cmVhc3VyZXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCk6IHZvaWQge1xyXG4gICAgICAgICAgICBsZXQgaTogbnVtYmVyID0gMDtcclxuICAgICAgICAgICAgdGhpcy50cmVhc3VyZXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24obmV3IMaSLlZlY3RvcjIodGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi54ICsgaSwgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGlvbi55KSlcclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBvbkl0ZW1Db2xsZWN0KF9pdGVtOiBJdGVtcy5JdGVtKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLnRyZWFzdXJlcy5maW5kKGl0ZW0gPT4gaXRlbSA9PSBfaXRlbSkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnRyZWFzdXJlcy5zcGxpY2UodGhpcy50cmVhc3VyZXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgTWVyY2hhbnRSb29tIGV4dGVuZHMgUm9vbSB7XHJcbiAgICAgICAgcHJpdmF0ZSBtZXJjaGFudFJvb21NYXQ6IMaSLk1hdGVyaWFsID0gbmV3IMaSLk1hdGVyaWFsKFwibWVyY2hhbnRSb29tTWF0XCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImdyZWVuXCIpKSk7XHJcbiAgICAgICAgcHJpdmF0ZSBtZXJjaGFudDogRW50aXR5Lk1lcmNoYW50ID0gbmV3IEVudGl0eS5NZXJjaGFudChFbnRpdHkuSUQuTUVSQ0hBTlQpO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbXM6IEl0ZW1zLkl0ZW1bXSA9IFtdO1xyXG4gICAgICAgIHByaXZhdGUgaXRlbXNTcGF3blBvaW50czogxpIuVmVjdG9yMltdID0gW107XHJcbiAgICAgICAgcHJpdmF0ZSBpdGVtQ291bnQ6IG51bWJlciA9IDU7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX2Nvb3JkaW5hdGVzOiBHYW1lLsaSLlZlY3RvcjIsIF9yb29tU2l6ZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKF9jb29yZGluYXRlcywgX3Jvb21TaXplLCBST09NVFlQRS5NRVJDSEFOVCk7XHJcbiAgICAgICAgICAgIHRoaXMuZ2V0Q29tcG9uZW50KEdhbWUuxpIuQ29tcG9uZW50TWF0ZXJpYWwpLm1hdGVyaWFsID0gdGhpcy5tZXJjaGFudFJvb21NYXQ7XHJcblxyXG4gICAgICAgICAgICB0aGlzLm1lcmNoYW50Lm10eExvY2FsLnRyYW5zbGF0ZVooMC4wMSk7XHJcbiAgICAgICAgICAgIHRoaXMubWVyY2hhbnQubXR4TG9jYWwudHJhbnNsYXRlWSg1IC8gdGhpcy5yb29tU2l6ZSk7XHJcbiAgICAgICAgICAgIHRoaXMubWVyY2hhbnQubXR4TG9jYWwuc2NhbGUoR2FtZS7Gki5WZWN0b3IzLk9ORSgxIC8gdGhpcy5yb29tU2l6ZSkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMubWVyY2hhbnQpO1xyXG5cclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5jcmVhdGVTaG9wKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlU2hvcCgpIHtcclxuICAgICAgICAgICAgbGV0IGl0ZW1zOiBJdGVtcy5JdGVtW10gPSBbXTtcclxuICAgICAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCB0aGlzLml0ZW1Db3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpdGVtcy5wdXNoKEl0ZW1zLkl0ZW1HZW5lcmF0b3IuZ2V0UmFuZG9tSXRlbSgpKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zID0gaXRlbXM7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25BZGRUb0dyYXBoKCk6IHZvaWQge1xyXG4gICAgICAgICAgICB0aGlzLmNyZWF0ZVNwYXduUG9pbnRzKCk7XHJcblxyXG4gICAgICAgICAgICBsZXQgaSA9IDA7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXMuZm9yRWFjaChpdGVtID0+IHtcclxuICAgICAgICAgICAgICAgIGlmIChpdGVtLmdldFBvc2l0aW9uICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLml0ZW1zU3Bhd25Qb2ludHMuZmluZChwb3MgPT4gcG9zLmVxdWFscyhpdGVtLmdldFBvc2l0aW9uKSkgPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5pdGVtc1NwYXduUG9pbnRzW2ldKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGl0ZW0uc2V0UG9zaXRpb24odGhpcy5pdGVtc1NwYXduUG9pbnRzW2ldKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGl0ZW0uc3Bhd24oKTtcclxuICAgICAgICAgICAgICAgIGkrKztcclxuICAgICAgICAgICAgfSlcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByaXZhdGUgY3JlYXRlU3Bhd25Qb2ludHMoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cyA9IFtdO1xyXG5cclxuICAgICAgICAgICAgbGV0IG1pZGRsZSA9IHRoaXMubXR4V29ybGQuY2xvbmUudHJhbnNsYXRpb247XHJcblxyXG4gICAgICAgICAgICB0aGlzLml0ZW1zU3Bhd25Qb2ludHMucHVzaChuZXcgxpIuVmVjdG9yMihtaWRkbGUueCwgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54ICsgMywgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54IC0gMywgbWlkZGxlLnkgKyAzKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54ICsgMiwgbWlkZGxlLnkgKyAxKSk7XHJcbiAgICAgICAgICAgIHRoaXMuaXRlbXNTcGF3blBvaW50cy5wdXNoKG5ldyDGki5WZWN0b3IyKG1pZGRsZS54IC0gMiwgbWlkZGxlLnkgKyAxKSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb25JdGVtQ29sbGVjdChfaXRlbTogSXRlbXMuSXRlbSwgX2F2YXRhcjogUGxheWVyLlBsYXllcik6IGJvb2xlYW4ge1xyXG4gICAgICAgICAgICBpZiAodGhpcy5pdGVtcy5maW5kKGl0ZW0gPT4gaXRlbSA9PSBfaXRlbSkgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcy5zaG9waW5nKF9pdGVtLCBfYXZhdGFyKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwcml2YXRlIHNob3BpbmcoX2l0ZW06IEl0ZW1zLkl0ZW0sIF9hdmF0YXI6IFBsYXllci5QbGF5ZXIpOiBib29sZWFuIHtcclxuICAgICAgICAgICAgbGV0IHNhbWVSYXJpdHk6IEl0ZW1zLkl0ZW1bXSA9IF9hdmF0YXIuaXRlbXMuZmlsdGVyKGl0ZW0gPT4gaXRlbS5yYXJpdHkgPT0gX2l0ZW0ucmFyaXR5KTtcclxuICAgICAgICAgICAgbGV0IGxvd2VyUmFyaXR5OiBJdGVtcy5JdGVtW10gPSBbXTtcclxuXHJcbiAgICAgICAgICAgIGlmIChfaXRlbS5yYXJpdHkgIT0gSXRlbXMuUkFSSVRZLkNPTU1PTikge1xyXG4gICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkgPSBfYXZhdGFyLml0ZW1zLmZpbHRlcihpdGVtID0+IGl0ZW0ucmFyaXR5ID09IChfaXRlbS5yYXJpdHkgLSAxKSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChzYW1lUmFyaXR5Lmxlbmd0aCA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBpbmRleDogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKHNhbWVSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgc2FtZVJhcml0eVtpbmRleF0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5pdGVtcy5zcGxpY2UodGhpcy5pdGVtcy5pbmRleE9mKF9pdGVtKSwgMSk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgc2FtZVJhcml0eVtpbmRleF0uaWQsIHNhbWVSYXJpdHlbaW5kZXhdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmIChsb3dlclJhcml0eS5sZW5ndGggPj0gMykge1xyXG4gICAgICAgICAgICAgICAgICAgIGxldCBpbmRleDE6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChsb3dlclJhcml0eS5sZW5ndGggLSAxKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHlbaW5kZXgxXS5yZW1vdmVJdGVtVG9FbnRpdHkoX2F2YXRhcik7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGxvd2VyUmFyaXR5LmluZGV4T2YobG93ZXJSYXJpdHlbaW5kZXgxXSksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNsaWNlKGluZGV4MSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc3BsaWNlKGluZGV4MSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkoZmFsc2UsIGxvd2VyUmFyaXR5W2luZGV4MV0uaWQsIGxvd2VyUmFyaXR5W2luZGV4MV0ubmV0SWQsIF9hdmF0YXIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBsZXQgaW5kZXgyOiBudW1iZXIgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAobG93ZXJSYXJpdHkubGVuZ3RoIC0gMSkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5W2luZGV4Ml0ucmVtb3ZlSXRlbVRvRW50aXR5KF9hdmF0YXIpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShsb3dlclJhcml0eS5pbmRleE9mKGxvd2VyUmFyaXR5W2luZGV4Ml0pLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zbGljZShpbmRleDIsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIGxvd2VyUmFyaXR5LnNwbGljZShpbmRleDIsIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBsb3dlclJhcml0eVtpbmRleDJdLmlkLCBsb3dlclJhcml0eVtpbmRleDJdLm5ldElkLCBfYXZhdGFyLm5ldElkKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IGluZGV4MzogbnVtYmVyID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogKGxvd2VyUmFyaXR5Lmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eVtpbmRleDNdLnJlbW92ZUl0ZW1Ub0VudGl0eShfYXZhdGFyKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UobG93ZXJSYXJpdHkuaW5kZXhPZihsb3dlclJhcml0eVtpbmRleDNdKSwgMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgbG93ZXJSYXJpdHkuc2xpY2UoaW5kZXgzLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBsb3dlclJhcml0eS5zcGxpY2UoaW5kZXgzLCAxKTtcclxuICAgICAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUludmVudG9yeShmYWxzZSwgbG93ZXJSYXJpdHlbaW5kZXgzXS5pZCwgbG93ZXJSYXJpdHlbaW5kZXgzXS5uZXRJZCwgX2F2YXRhci5uZXRJZCk7XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuaXRlbXMuc3BsaWNlKHRoaXMuaXRlbXMuaW5kZXhPZihfaXRlbSksIDEpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIGVudW0gQ0hBTExFTkdFIHtcclxuICAgICAgICBUSE9SU0hBTU1FUlxyXG4gICAgfVxyXG4gICAgZXhwb3J0IGNsYXNzIENoYWxsZW5nZVJvb20gZXh0ZW5kcyBSb29tIHtcclxuICAgICAgICBjaGFsbGVuZ2U6IENIQUxMRU5HRTtcclxuICAgICAgICBjaGFsbGVuZ2VSb29tTWF0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcImNoYWxsZW5nZVJvb21NYXRcIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiYmx1ZVwiKSkpO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vcmRpbmF0ZXM6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb21TaXplOiBudW1iZXIpIHtcclxuICAgICAgICAgICAgc3VwZXIoX2Nvb3JkaW5hdGVzLCBfcm9vbVNpemUsIFJPT01UWVBFLkNIQUxMRU5HRSk7XHJcbiAgICAgICAgICAgIHRoaXMuZW5lbXlDb3VudE1hbmFnZXIgPSBuZXcgRW5lbXlDb3VudE1hbmFnZXIoMTApO1xyXG4gICAgICAgICAgICB0aGlzLmdldENvbXBvbmVudChHYW1lLsaSLkNvbXBvbmVudE1hdGVyaWFsKS5tYXRlcmlhbCA9IHRoaXMuY2hhbGxlbmdlUm9vbU1hdDtcclxuICAgICAgICAgICAgdGhpcy5jaGFsbGVuZ2UgPSB0aGlzLnJhbmRvbUNoYWxsZW5nZSgpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHJhbmRvbUNoYWxsZW5nZSgpOiBDSEFMTEVOR0Uge1xyXG4gICAgICAgICAgICBsZXQgaW5kZXg6IG51bWJlciA9IE1hdGgucm91bmQoTWF0aC5yYW5kb20oKSAqIChPYmplY3Qua2V5cyhDSEFMTEVOR0UpLmxlbmd0aCAvIDIgLSAxKSk7XHJcbiAgICAgICAgICAgIHJldHVybiAoPGFueT5DSEFMTEVOR0UpW0NIQUxMRU5HRVtpbmRleF1dO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIHVwZGF0ZSgpOiB2b2lkIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuY2hhbGxlbmdlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhc2UgQ0hBTExFTkdFLlRIT1JTSEFNTUVSOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5zdG9wVGhvcnNIYW1tZXJDaGFsbGVuZ2UoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHVibGljIG9uQWRkVG9HcmFwaCgpOiB2b2lkIHtcclxuICAgICAgICAgICAgc3dpdGNoICh0aGlzLmNoYWxsZW5nZSkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSBDSEFMTEVOR0UuVEhPUlNIQU1NRVI6XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydFRob3JzSGFtbWVyQ2hhbGxlbmdlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcblxyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgcHJvdGVjdGVkIHN0YXJ0VGhvcnNIYW1tZXJDaGFsbGVuZ2UoKSB7XHJcbiAgICAgICAgICAgIC8vVE9ETzogYWN0aXZhdGVcclxuICAgICAgICAgICAgLy8gaWYgKHRoaXMuZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgLy8gICAgIHJldHVybjtcclxuICAgICAgICAgICAgLy8gfVxyXG5cclxuICAgICAgICAgICAgR2FtZS5hdmF0YXIxLndlYXBvbi5jYW5TaG9vdCA9IGZhbHNlO1xyXG4gICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmNhblNob290ID0gZmFsc2U7XHJcblxyXG4gICAgICAgICAgICBsZXQgdGhvcnNoYW1tZXI6IEl0ZW1zLkludGVybmFsSXRlbSA9IG5ldyBJdGVtcy5JbnRlcm5hbEl0ZW0oSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuICAgICAgICAgICAgbGV0IGNob29zZW5PbmU6IFBsYXllci5QbGF5ZXI7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgY2hvb3Nlbk9uZSA9IEdhbWUuYXZhdGFyMTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGNob29zZW5PbmUgPSBHYW1lLmF2YXRhcjI7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIHRob3JzaGFtbWVyLmFkZEl0ZW1Ub0VudGl0eShjaG9vc2VuT25lKTtcclxuICAgICAgICAgICAgY2hvb3Nlbk9uZS5pdGVtcy5wdXNoKHRob3JzaGFtbWVyKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVJbnZlbnRvcnkodHJ1ZSwgdGhvcnNoYW1tZXIuaWQsIHRob3JzaGFtbWVyLm5ldElkLCBjaG9vc2VuT25lLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIxLndlYXBvbiwgR2FtZS5hdmF0YXIxLm5ldElkKTtcclxuICAgICAgICAgICAgTmV0d29ya2luZy51cGRhdGVBdmF0YXJXZWFwb24oR2FtZS5hdmF0YXIyLndlYXBvbiwgR2FtZS5hdmF0YXIyLm5ldElkKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHByb3RlY3RlZCBzdG9wVGhvcnNIYW1tZXJDaGFsbGVuZ2UoKSB7XHJcbiAgICAgICAgICAgIGxldCBhdmF0YXIxSW52ID0gR2FtZS5hdmF0YXIxLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcbiAgICAgICAgICAgIGxldCBhdmF0YXIySW52ID0gR2FtZS5hdmF0YXIyLml0ZW1zLmZpbmQoaXRlbSA9PiBpdGVtLmlkID09IEl0ZW1zLklURU1JRC5USE9SU0hBTU1FUik7XHJcblxyXG4gICAgICAgICAgICBpZiAoYXZhdGFyMUludiAhPSB1bmRlZmluZWQgfHwgYXZhdGFyMkludiAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGlmIChhdmF0YXIxSW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5pdGVtcy5zcGxpY2UoR2FtZS5hdmF0YXIxLml0ZW1zLmluZGV4T2YoYXZhdGFyMUludiksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBhdmF0YXIxSW52LmlkLCBhdmF0YXIxSW52Lm5ldElkLCBHYW1lLmF2YXRhcjEubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJ1bGxldHMuQlVMTEVUVFlQRSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJidWxsZXRUeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0aWxlQW1vdW50XCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgIGlmIChhdmF0YXIySW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5pdGVtcy5zcGxpY2UoR2FtZS5hdmF0YXIyLml0ZW1zLmluZGV4T2YoYXZhdGFyMkludiksIDEpO1xyXG4gICAgICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlSW52ZW50b3J5KGZhbHNlLCBhdmF0YXIySW52LmlkLCBhdmF0YXIySW52Lm5ldElkLCBHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG5cclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLmdldENvb2xEb3duLnNldE1heENvb2xEb3duID0gK2xvY2FsU3RvcmFnZS5nZXRJdGVtKFwiY29vbGRvd25UaW1lXCIpO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uYWltVHlwZSA9ICg8YW55PldlYXBvbnMuQUlNKVtsb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImFpbVR5cGVcIildO1xyXG4gICAgICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uYnVsbGV0VHlwZSA9ICg8YW55PkJ1bGxldHMuQlVMTEVUVFlQRSlbbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJidWxsZXRUeXBlXCIpXTtcclxuICAgICAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjIud2VhcG9uLnByb2plY3RpbGVBbW91bnQgPSArbG9jYWxTdG9yYWdlLmdldEl0ZW0oXCJwcm9qZWN0aWxlQW1vdW50XCIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG5cclxuXHJcbiAgICAgICAgICAgICAgICBHYW1lLmF2YXRhcjEud2VhcG9uLmNhblNob290ID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi53ZWFwb24uY2FuU2hvb3QgPSB0cnVlO1xyXG5cclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcudXBkYXRlQXZhdGFyV2VhcG9uKEdhbWUuYXZhdGFyMS53ZWFwb24sIEdhbWUuYXZhdGFyMS5uZXRJZCk7XHJcbiAgICAgICAgICAgICAgICBOZXR3b3JraW5nLnVwZGF0ZUF2YXRhcldlYXBvbihHYW1lLmF2YXRhcjIud2VhcG9uLCBHYW1lLmF2YXRhcjIubmV0SWQpO1xyXG4gICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICBsZXQgcm9vbUludiA9IEdhbWUuaXRlbXMuZmluZChpdGVtID0+IGl0ZW0uaWQgPT0gSXRlbXMuSVRFTUlELlRIT1JTSEFNTUVSKTtcclxuXHJcbiAgICAgICAgICAgIGlmIChyb29tSW52ICE9IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgcm9vbUludi5kZXNwYXduKCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgfVxyXG5cclxuICAgIGV4cG9ydCBjbGFzcyBXYWxsIGV4dGVuZHMgxpIuTm9kZSB7XHJcbiAgICAgICAgcHVibGljIHRhZzogVGFnLlRBRyA9IFRhZy5UQUcuV0FMTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IEdhbWUuxpIuUmVjdGFuZ2xlO1xyXG4gICAgICAgIHB1YmxpYyBkb29yOiBEb29yO1xyXG4gICAgICAgIHByaXZhdGUgbm9ybWFsOiBHYW1lLsaSLlZlY3RvcjM7IGdldCBnZXROb3JtYWwoKTogR2FtZS7Gki5WZWN0b3IzIHsgcmV0dXJuIHRoaXMubm9ybWFsIH07XHJcblxyXG4gICAgICAgIGNvbnN0cnVjdG9yKF9wb3M6IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxpbmc6IEdhbWUuxpIuVmVjdG9yMiwgX3Jvb206IFJvb20pIHtcclxuICAgICAgICAgICAgc3VwZXIoXCJXYWxsXCIpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudFRyYW5zZm9ybSgpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1lc2gobmV3IMaSLk1lc2hRdWFkKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNYXRlcmlhbChuZXcgxpIuTWF0ZXJpYWwoXCJyZWRcIiwgxpIuU2hhZGVyTGl0LCBuZXcgxpIuQ29hdFJlbWlzc2l2ZSjGki5Db2xvci5DU1MoXCJyZWRcIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgbGV0IG5ld1BvcyA9IF9wb3MudG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3UG9zO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBfc2NhbGluZy50b1ZlY3RvcjMoMSk7XHJcblxyXG5cclxuICAgICAgICAgICAgaWYgKF9wb3MueCAhPSAwKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy54ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygtMSwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9wb3MueCA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoMSwgMCwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy55ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuYWRkRG9vcihfcG9zLCBfc2NhbGluZyk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3JtYWwgPSBuZXcgxpIuVmVjdG9yMygwLCAtMSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF9wb3MueSA8IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmFkZERvb3IoX3BvcywgX3NjYWxpbmcpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMubm9ybWFsID0gbmV3IMaSLlZlY3RvcjMoMCwgMSwgMCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG5cclxuICAgICAgICBhZGREb29yKF9wb3M6IEdhbWUuxpIuVmVjdG9yMiwgX3NjYWxpbmc6IEdhbWUuxpIuVmVjdG9yMikge1xyXG4gICAgICAgICAgICB0aGlzLmRvb3IgPSBuZXcgRG9vcigpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENoaWxkKHRoaXMuZG9vcik7XHJcblxyXG4gICAgICAgICAgICBpZiAoTWF0aC5hYnMoX3Bvcy54KSA+IDApIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC5zY2FsaW5nID0gbmV3IEdhbWUuxpIuVmVjdG9yMygxLCBfc2NhbGluZy54IC8gX3NjYWxpbmcueSAqIDMsIDEpO1xyXG4gICAgICAgICAgICAgICAgaWYgKF9wb3MueCA+IDApIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IuZGlyZWN0aW9uID0gKDxJbnRlcmZhY2VzLklSb29tRXhpdHM+eyBub3J0aDogZmFsc2UsIGVhc3Q6IHRydWUsIHNvdXRoOiBmYWxzZSwgd2VzdDogZmFsc2UgfSk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnRyYW5zbGF0ZVgoLTAuNSk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiBmYWxzZSwgZWFzdDogZmFsc2UsIHNvdXRoOiBmYWxzZSwgd2VzdDogdHJ1ZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWCgwLjUpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kb29yLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKF9zY2FsaW5nLnkgLyBfc2NhbGluZy54ICogMywgMSwgMSk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3Bvcy55ID4gMCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5kaXJlY3Rpb24gPSAoPEludGVyZmFjZXMuSVJvb21FeGl0cz57IG5vcnRoOiB0cnVlLCBlYXN0OiBmYWxzZSwgc291dGg6IGZhbHNlLCB3ZXN0OiBmYWxzZSB9KTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmRvb3IubXR4TG9jYWwudHJhbnNsYXRlWSgtMC41KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5kb29yLmRpcmVjdGlvbiA9ICg8SW50ZXJmYWNlcy5JUm9vbUV4aXRzPnsgbm9ydGg6IGZhbHNlLCBlYXN0OiBmYWxzZSwgc291dGg6IHRydWUsIHdlc3Q6IGZhbHNlIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZG9vci5tdHhMb2NhbC50cmFuc2xhdGVZKDAuNSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHNldENvbGxpZGVyKCkge1xyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IEdhbWUuxpIuUmVjdGFuZ2xlKHRoaXMubXR4V29ybGQudHJhbnNsYXRpb24ueCwgdGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi55LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueCwgdGhpcy5tdHhXb3JsZC5zY2FsaW5nLnksIEdhbWUuxpIuT1JJR0lOMkQuQ0VOVEVSKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGNsYXNzIERvb3IgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5ET09SO1xyXG4gICAgICAgIHB1YmxpYyBjb2xsaWRlcjogR2FtZS7Gki5SZWN0YW5nbGU7XHJcblxyXG4gICAgICAgIHB1YmxpYyBkaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiRG9vclwiKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRUcmFuc2Zvcm0oKSk7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyDGki5Db21wb25lbnRNZXNoKG5ldyDGki5NZXNoUXVhZCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwobmV3IMaSLk1hdGVyaWFsKFwiZ3JlZW5cIiwgxpIuU2hhZGVyRmxhdCwgbmV3IMaSLkNvYXRSZW1pc3NpdmUoxpIuQ29sb3IuQ1NTKFwiZ3JlZW5cIikpKSkpO1xyXG5cclxuICAgICAgICAgICAgdGhpcy5tdHhMb2NhbC50cmFuc2xhdGVaKDAuMSk7XHJcbiAgICAgICAgICAgIHRoaXMuY2xvc2VEb29yKCk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRDb2xsaWRlcigpIHtcclxuICAgICAgICAgICAgaWYgKHRoaXMuaXNBY3RpdmUpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuY29sbGlkZXIgPSBuZXcgR2FtZS7Gki5SZWN0YW5nbGUodGhpcy5tdHhXb3JsZC50cmFuc2xhdGlvbi54LCB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uLnksIHRoaXMubXR4V29ybGQuc2NhbGluZy54LCB0aGlzLm10eFdvcmxkLnNjYWxpbmcueSwgR2FtZS7Gki5PUklHSU4yRC5DRU5URVIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2hhbmdlUm9vbSgpIHtcclxuICAgICAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICAgICAgR2VuZXJhdGlvbi5zd2l0Y2hSb29tKHRoaXMuZGlyZWN0aW9uKTtcclxuICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgIE5ldHdvcmtpbmcuc3dpdGNoUm9vbVJlcXVlc3QodGhpcy5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgb3BlbkRvb3IoKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYWN0aXZhdGUodHJ1ZSk7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBwdWJsaWMgY2xvc2VEb29yKCkge1xyXG4gICAgICAgICAgICB0aGlzLmFjdGl2YXRlKGZhbHNlKTtcclxuICAgICAgICB9XHJcblxyXG5cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgY2xhc3MgT2JzaXRjYWwgZXh0ZW5kcyDGki5Ob2RlIHtcclxuICAgICAgICBwdWJsaWMgdGFnOiBUYWcuVEFHID0gVGFnLlRBRy5PQlNUSUNBTDtcclxuICAgICAgICBwdWJsaWMgY29sbGlkZXI6IENvbGxpZGVyLkNvbGxpZGVyO1xyXG4gICAgICAgIHB1YmxpYyBwYXJlbnRSb29tOiBSb29tO1xyXG5cclxuICAgICAgICBkaXJlY3Rpb246IEludGVyZmFjZXMuSVJvb21FeGl0cztcclxuXHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogUm9vbSwgX3Bvc2l0aW9uOiBHYW1lLsaSLlZlY3RvcjIsIF9zY2FsZTogbnVtYmVyKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwiT2JzdGljYWxcIik7XHJcblxyXG4gICAgICAgICAgICB0aGlzLnBhcmVudFJvb20gPSBfcGFyZW50O1xyXG4gICAgICAgICAgICB0aGlzLnBhcmVudFJvb20ub2JzdGljYWxzLnB1c2godGhpcyk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLmFkZENvbXBvbmVudChuZXcgxpIuQ29tcG9uZW50TWVzaChuZXcgxpIuTWVzaFF1YWQpKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IMaSLkNvbXBvbmVudE1hdGVyaWFsKG5ldyDGki5NYXRlcmlhbChcImJsYWNrXCIsIMaSLlNoYWRlckZsYXQsIG5ldyDGki5Db2F0UmVtaXNzaXZlKMaSLkNvbG9yLkNTUyhcImJsYWNrXCIpKSkpKTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24gPSBfcG9zaXRpb24udG9WZWN0b3IzKDAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxlKEdhbWUuxpIuVmVjdG9yMy5PTkUoX3NjYWxlKSk7XHJcblxyXG4gICAgICAgICAgICB0aGlzLmNvbGxpZGVyID0gbmV3IENvbGxpZGVyLkNvbGxpZGVyKHRoaXMubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCksIHRoaXMubXR4TG9jYWwuc2NhbGluZy54IC8gMiwgbnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEdlbmVyYXRpb24ge1xyXG5cclxuICAgIGxldCBudW1iZXJPZlJvb21zOiBudW1iZXIgPSA1O1xyXG4gICAgZXhwb3J0IGxldCBnZW5lcmF0aW9uRmFpbGVkID0gZmFsc2U7XHJcbiAgICBleHBvcnQgbGV0IHJvb21zOiBSb29tW10gPSBbXTtcclxuXHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZU5vcnRoOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigwLCAxKTtcclxuICAgIGV4cG9ydCBjb25zdCBjb21wYXJlRWFzdDogR2FtZS7Gki5WZWN0b3IyID0gbmV3IMaSLlZlY3RvcjIoMSwgMCk7XHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZVNvdXRoOiBHYW1lLsaSLlZlY3RvcjIgPSBuZXcgxpIuVmVjdG9yMigwLCAtMSk7XHJcbiAgICBleHBvcnQgY29uc3QgY29tcGFyZVdlc3Q6IEdhbWUuxpIuVmVjdG9yMiA9IG5ldyDGki5WZWN0b3IyKC0xLCAwKTtcclxuXHJcbiAgICAvL3NwYXduIGNoYW5jZXNcclxuICAgIGxldCBjaGFsbGVuZ2VSb29tU3Bhd25DaGFuY2U6IG51bWJlciA9IDMwO1xyXG5cclxuICAgIGV4cG9ydCBmdW5jdGlvbiBwcm9jZWR1YWxSb29tR2VuZXJhdGlvbigpIHtcclxuICAgICAgICByb29tcyA9IFtdO1xyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSBmYWxzZTtcclxuICAgICAgICByb29tcy5wdXNoKGdlbmVyYXRlU3RhcnRSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2guYXBwbHkocm9vbXMsIGdlbmVyYXRlTm9ybWFsUm9vbXMoKSk7XHJcbiAgICAgICAgYWRkQm9zc1Jvb20oKTtcclxuICAgICAgICByb29tcy5wdXNoLmFwcGx5KHJvb21zLCBnZW5lcmF0ZVRyZWFzdXJlUm9vbSgpKTtcclxuICAgICAgICByb29tcy5wdXNoKGdlbmVyYXRlTWVyY2hhbnRSb29tKCkpO1xyXG4gICAgICAgIHJvb21zLnB1c2goZ2VuZXJhdGVDaGFsbGVuZ2VSb29tKCkpO1xyXG4gICAgICAgIHNldEV4aXRzKCk7XHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHsgY29uc29sZS5sb2cocm9vbS5tdHhMb2NhbC50cmFuc2xhdGlvbi5jbG9uZS50b1N0cmluZygpKSB9KTtcclxuICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMocm9vbXNbMF0pO1xyXG5cclxuXHJcbiAgICAgICAgc2V0RXhpdHMoKTtcclxuICAgICAgICBhZGRSb29tVG9HcmFwaChyb29tc1swXSk7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGdlbmVyYXRlcyBhIGdyaWQgdGhhdHMgY29ubmVjdGVkIHRvZ2dldGhlciBmcm9tIGEgZ2l2ZW4gc3RhcnRpbmcgcG9pbnRcclxuICAgICAqIEBwYXJhbSBfc3RhcnRDb29yZCB0aGUgc3RhcnRpbmcgcG9pbnRcclxuICAgICAqIEByZXR1cm5zIHZlY3RvcjIgYXJyYXkgb2YgYSBjb25uZWN0aW5nIGdyaWQgd2l0aG91dCBvdmVybGFwc1xyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZVNuYWtlR3JpZChfc3RhcnRDb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBncmlkOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIGdyaWQucHVzaChfc3RhcnRDb29yZCk7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1iZXJPZlJvb21zOyBpKyspIHtcclxuICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoZ3JpZCwgZ3JpZFtncmlkLmxlbmd0aCAtIDFdKTtcclxuICAgICAgICAgICAgaWYgKG5leHRDb29yZCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICB9IGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZ3JpZC5wdXNoKG5leHRDb29yZCk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGdyaWQ7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIGZ1bmN0aW9uIHRvIGdldCBhIHJhbmRvbSBuZWlnaWhib3VyIHRha2luZyBjYXJlIG9mIGFuIGFjdXRhbCBncmlkXHJcbiAgICAgKiBAcGFyYW0gX2dyaWQgZXhpc3RpbmcgZ3JpZCB0aGUgZnVuY3Rpb24gc2hvdWxkIGNhcmUgYWJvdXRcclxuICAgICAqIEBwYXJhbSBfc3BlY2lmaWNDb29yZCB0aGUgY29vcmQgeW91IHdhbnQgdGhlIG5leHQgcG9zc2libGUgY29vcmQgXHJcbiAgICAgKiBAcmV0dXJucyBhIHZlY3RvcjIgY29vcmQgdGhhdHMgbm90IGluc2lkZSBvZiBfZ3JpZCBhbmQgYXJvdW5kICBfc3BlY2lmaWNDb29yZFxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKF9ncmlkOiBHYW1lLsaSLlZlY3RvcjJbXSwgX3NwZWNpZmljQ29vcmQ6IEdhbWUuxpIuVmVjdG9yMik6IEdhbWUuxpIuVmVjdG9yMiB7XHJcbiAgICAgICAgbGV0IGNvb3JkTmVpZ2hib3VyczogR2FtZS7Gki5WZWN0b3IyW10gPSBnZXROZWlnaGJvdXJDb29yZGluYXRlKF9zcGVjaWZpY0Nvb3JkKTtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IGNvb3JkTmVpZ2hib3Vycy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBsZXQgcmFuZG9tSW5kZXggPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkgKiAoY29vcmROZWlnaGJvdXJzLmxlbmd0aCAtIDEpKTtcclxuICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGNvb3JkTmVpZ2hib3Vyc1tyYW5kb21JbmRleF07XHJcbiAgICAgICAgICAgIGlmIChfZ3JpZC5maW5kKGNvb3JkID0+IGNvb3JkLmVxdWFscyhuZXh0Q29vcmQpKSkge1xyXG4gICAgICAgICAgICAgICAgY29vcmROZWlnaGJvdXJzID0gY29vcmROZWlnaGJvdXJzLmZpbHRlcihjb29yZCA9PiAhY29vcmQuZXF1YWxzKG5leHRDb29yZCkpO1xyXG4gICAgICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gbmV4dENvb3JkO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgYWxsIG5laWdoYm91cnMgaWdub3JpbmcgdGhlIGN1cnJlbnQgZ3JpZFxyXG4gICAgICogQHBhcmFtIF9jb29yZCBjb29yZGlhbnRlIHlvdSB3YW50IHRoZSBuZWlnaGJvdXIgZnJvbVxyXG4gICAgICogQHJldHVybnMgNCBuZWlnaGJvdXJzIGluIGRpcmVjdGlvbiBOIEUgUyBhbmQgV1xyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXROZWlnaGJvdXJDb29yZGluYXRlKF9jb29yZDogR2FtZS7Gki5WZWN0b3IyKTogR2FtZS7Gki5WZWN0b3IyW10ge1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIG5laWdoYm91cnMucHVzaChuZXcgxpIuVmVjdG9yMihfY29vcmQueCArIDEsIF9jb29yZC55KSk7XHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54IC0gMSwgX2Nvb3JkLnkpKTtcclxuXHJcbiAgICAgICAgbmVpZ2hib3Vycy5wdXNoKG5ldyDGki5WZWN0b3IyKF9jb29yZC54LCBfY29vcmQueSArIDEpKTtcclxuICAgICAgICBuZWlnaGJvdXJzLnB1c2gobmV3IMaSLlZlY3RvcjIoX2Nvb3JkLngsIF9jb29yZC55IC0gMSkpO1xyXG4gICAgICAgIHJldHVybiBuZWlnaGJvdXJzO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlU3RhcnRSb29tKCk6IFN0YXJ0Um9vbSB7XHJcbiAgICAgICAgbGV0IHN0YXJ0Um9vbTogU3RhcnRSb29tID0gbmV3IFN0YXJ0Um9vbShuZXcgxpIuVmVjdG9yMigwLCAwKSwgMjApO1xyXG4gICAgICAgIHJldHVybiBzdGFydFJvb207XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVOb3JtYWxSb29tcygpOiBOb3JtYWxSb29tW10ge1xyXG4gICAgICAgIGxldCBncmlkQ29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXTtcclxuICAgICAgICBsZXQgbm9ybWFsUm9vbXM6IE5vcm1hbFJvb21bXSA9IFtdO1xyXG4gICAgICAgIHdoaWxlICh0cnVlKSB7XHJcbiAgICAgICAgICAgIGdyaWRDb29yZHMgPSBnZW5lcmF0ZVNuYWtlR3JpZChyb29tc1swXS5jb29yZGluYXRlcyk7XHJcbiAgICAgICAgICAgIGlmICgoZ3JpZENvb3Jkcy5sZW5ndGggLSAxKSA9PSBudW1iZXJPZlJvb21zKSB7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBncmlkQ29vcmRzLmZvckVhY2goY29vcmQgPT4ge1xyXG4gICAgICAgICAgICBub3JtYWxSb29tcy5wdXNoKG5ldyBOb3JtYWxSb29tKGNvb3JkLCAyMCkpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIG5vcm1hbFJvb21zO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIGFkZEJvc3NSb29tKCkge1xyXG4gICAgICAgIGxldCBiaWdnZXN0RGlzdGFuY2U6IEdhbWUuxpIuVmVjdG9yMiA9IMaSLlZlY3RvcjIuWkVSTygpO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGlmIChNYXRoLmFicyhyb29tLmNvb3JkaW5hdGVzLngpID4gYmlnZ2VzdERpc3RhbmNlLnggJiYgTWF0aC5hYnMocm9vbS5jb29yZGluYXRlcy55KSA+IGJpZ2dlc3REaXN0YW5jZS55KSB7XHJcbiAgICAgICAgICAgICAgICBiaWdnZXN0RGlzdGFuY2UgPSByb29tLmNvb3JkaW5hdGVzO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuICAgICAgICBsZXQgcm9vbUNvb3JkOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldENvb3Jkc0Zyb21Sb29tcygpO1xyXG4gICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKHJvb21Db29yZCwgcm9vbUNvb3JkW3Jvb21Db29yZC5sZW5ndGggLSAxXSk7XHJcbiAgICAgICAgaWYgKG5leHRDb29yZCA9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgLy8gbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChyb29tQ29vcmQsIHJvb21Db29yZFtyb29tQ29vcmQubGVuZ3RoIC0gMl0pO1xyXG4gICAgICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJvb21zLnB1c2gobmV3IEJvc3NSb29tKG5leHRDb29yZCwgMzApKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVUcmVhc3VyZVJvb20oKTogVHJlYXN1cmVSb29tW10ge1xyXG4gICAgICAgIGxldCByb29tQ29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IGdldENvb3Jkc0Zyb21Sb29tcygpO1xyXG4gICAgICAgIGxldCBuZXdUcmVhc3VyZVJvb21zOiBUcmVhc3VyZVJvb21bXSA9IFtdXHJcbiAgICAgICAgcm9vbXMuZm9yRWFjaChyb29tID0+IHtcclxuICAgICAgICAgICAgaWYgKHJvb20ucm9vbVR5cGUgPT0gUk9PTVRZUEUuTk9STUFMKSB7XHJcbiAgICAgICAgICAgICAgICBsZXQgbmV4dENvb3JkID0gZ2V0TmV4dFBvc3NpYmxlQ29vcmRGcm9tU3BlY2lmaWNDb29yZChyb29tQ29vcmRzLCByb29tLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDb29yZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICBsZXQgdHJSb29tID0gbmV3IFRyZWFzdXJlUm9vbShuZXh0Q29vcmQsIDEwKTtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaXNTcGF3bmluZyh0clJvb20uZ2V0U3Bhd25DaGFuY2UpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG5ld1RyZWFzdXJlUm9vbXMucHVzaCh0clJvb20pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIG5ld1RyZWFzdXJlUm9vbXM7XHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gZ2VuZXJhdGVNZXJjaGFudFJvb20oKTogTWVyY2hhbnRSb29tIHtcclxuICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHJvb21zLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpID4gMCkge1xyXG4gICAgICAgICAgICAgICAgbGV0IG5leHRDb29yZCA9IGdldE5leHRQb3NzaWJsZUNvb3JkRnJvbVNwZWNpZmljQ29vcmQoZ2V0Q29vcmRzRnJvbVJvb21zKCksIHJvb21zW2ldLmNvb3JkaW5hdGVzKVxyXG4gICAgICAgICAgICAgICAgaWYgKG5leHRDb29yZCAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gbmV3IE1lcmNoYW50Um9vbShuZXh0Q29vcmQsIDIwKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBnZW5lcmF0aW9uRmFpbGVkID0gdHJ1ZTtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuXHJcbiAgICBmdW5jdGlvbiBnZW5lcmF0ZUNoYWxsZW5nZVJvb20oKTogQ2hhbGxlbmdlUm9vbSB7XHJcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCByb29tcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICBpZiAoaSA+IDApIHtcclxuICAgICAgICAgICAgICAgIGxldCBuZXh0Q29vcmQgPSBnZXROZXh0UG9zc2libGVDb29yZEZyb21TcGVjaWZpY0Nvb3JkKGdldENvb3Jkc0Zyb21Sb29tcygpLCByb29tc1tpXS5jb29yZGluYXRlcylcclxuICAgICAgICAgICAgICAgIGlmIChuZXh0Q29vcmQgIT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIG5ldyBDaGFsbGVuZ2VSb29tKG5leHRDb29yZCwgMjApO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGdlbmVyYXRpb25GYWlsZWQgPSB0cnVlO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBmdW5jdGlvbiB0byBnZXQgY29vcmRpYW50ZXMgZnJvbSBhbGwgZXhpc3Rpbmcgcm9vbXNcclxuICAgICAqIEByZXR1cm5zIFZlY3RvcjIgYXJyYXkgd2l0aCBjb29yZGluYXRlcyBvZiBhbGwgY3VycmVudCBleGlzdGluZyByb29tcyBpbiBSb29tR2VuZXJhdGlvbi5yb29tc1xyXG4gICAgICovXHJcbiAgICBleHBvcnQgZnVuY3Rpb24gZ2V0Q29vcmRzRnJvbVJvb21zKCk6IEdhbWUuxpIuVmVjdG9yMltdIHtcclxuICAgICAgICBsZXQgY29vcmRzOiBHYW1lLsaSLlZlY3RvcjJbXSA9IFtdO1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGNvb3Jkcy5wdXNoKHJvb20uY29vcmRpbmF0ZXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgcmV0dXJuIGNvb3Jkc1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIHNldEV4aXRzKCkge1xyXG4gICAgICAgIHJvb21zLmZvckVhY2gocm9vbSA9PiB7XHJcbiAgICAgICAgICAgIGxldCBuZWlnaGJvdXJzID0gcm9vbXMuZmlsdGVyKGVsZW1lbnQgPT4gZWxlbWVudCAhPSByb29tKTtcclxuICAgICAgICAgICAgbmVpZ2hib3Vycy5mb3JFYWNoKG5laWdoYm91ciA9PiB7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFJvb21FeGl0KG5laWdoYm91cik7XHJcbiAgICAgICAgICAgICAgICByb29tLnNldFNwYXduUG9pbnRzKCk7XHJcbiAgICAgICAgICAgICAgICByb29tLm9wZW5Eb29ycygpO1xyXG4gICAgICAgICAgICB9KVxyXG4gICAgICAgIH0pXHJcbiAgICB9XHJcblxyXG4gICAgZnVuY3Rpb24gaXNTcGF3bmluZyhfc3Bhd25DaGFuY2U6IG51bWJlcik6IGJvb2xlYW4ge1xyXG4gICAgICAgIGxldCB4ID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpICogMTAwKTtcclxuICAgICAgICBpZiAoeCA8IF9zcGF3bkNoYW5jZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG5cclxuICAgIGZ1bmN0aW9uIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhfZmlyc3RSb29tOiBSb29tKSB7XHJcbiAgICAgICAgbGV0IG5laWdoYm91ck46IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMihfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLngsIChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnkgKyAxKSkpKTtcclxuICAgICAgICBsZXQgbmVpZ2hib3VyRTogUm9vbSA9IHJvb21zLmZpbmQocm9vbSA9PiByb29tLmNvb3JkaW5hdGVzLmVxdWFscyhuZXcgR2FtZS7Gki5WZWN0b3IyKChfZmlyc3RSb29tLmNvb3JkaW5hdGVzLmNsb25lLnggKyAxKSwgX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55KSkpO1xyXG4gICAgICAgIGxldCBuZWlnaGJvdXJTOiBSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyBHYW1lLsaSLlZlY3RvcjIoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54LCAoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS55IC0gMSkpKSk7XHJcbiAgICAgICAgbGV0IG5laWdoYm91clc6IFJvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IEdhbWUuxpIuVmVjdG9yMigoX2ZpcnN0Um9vbS5jb29yZGluYXRlcy5jbG9uZS54IC0gMSksIF9maXJzdFJvb20uY29vcmRpbmF0ZXMuY2xvbmUueSkpKTtcclxuICAgICAgICBpZiAobmVpZ2hib3VyTiAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91ck4ucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91ck4ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJOLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJOLnJvb21TaXplIC8gMiksIG5laWdoYm91ck4uY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91ck4ucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJOLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJOKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG5laWdoYm91ckUgIT0gdW5kZWZpbmVkICYmICFuZWlnaGJvdXJFLnBvc2l0aW9uVXBkYXRlZCkge1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJFLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMobmVpZ2hib3VyRS5jb29yZGluYXRlcy54ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyRS5yb29tU2l6ZSAvIDIpLCBuZWlnaGJvdXJFLmNvb3JkaW5hdGVzLnkgKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJFLnJvb21TaXplIC8gMiksIC0wLjAxKTtcclxuICAgICAgICAgICAgbmVpZ2hib3VyRS5wb3NpdGlvblVwZGF0ZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBtb3ZlUm9vbVRvV29ybGRDb29yZHMobmVpZ2hib3VyRSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChuZWlnaGJvdXJTICE9IHVuZGVmaW5lZCAmJiAhbmVpZ2hib3VyUy5wb3NpdGlvblVwZGF0ZWQpIHtcclxuICAgICAgICAgICAgbmVpZ2hib3VyUy5tdHhMb2NhbC50cmFuc2xhdGlvbiA9IG5ldyDGki5WZWN0b3IzKG5laWdoYm91clMuY29vcmRpbmF0ZXMueCAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clMucm9vbVNpemUgLyAyKSwgbmVpZ2hib3VyUy5jb29yZGluYXRlcy55ICogKF9maXJzdFJvb20ucm9vbVNpemUgLyAyICsgbmVpZ2hib3VyUy5yb29tU2l6ZSAvIDIpLCAtMC4wMSk7XHJcbiAgICAgICAgICAgIG5laWdoYm91clMucG9zaXRpb25VcGRhdGVkID0gdHJ1ZTtcclxuICAgICAgICAgICAgbW92ZVJvb21Ub1dvcmxkQ29vcmRzKG5laWdoYm91clMpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobmVpZ2hib3VyVyAhPSB1bmRlZmluZWQgJiYgIW5laWdoYm91clcucG9zaXRpb25VcGRhdGVkKSB7XHJcbiAgICAgICAgICAgIG5laWdoYm91clcubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXcgxpIuVmVjdG9yMyhuZWlnaGJvdXJXLmNvb3JkaW5hdGVzLnggKiAoX2ZpcnN0Um9vbS5yb29tU2l6ZSAvIDIgKyBuZWlnaGJvdXJXLnJvb21TaXplIC8gMiksIG5laWdoYm91clcuY29vcmRpbmF0ZXMueSAqIChfZmlyc3RSb29tLnJvb21TaXplIC8gMiArIG5laWdoYm91clcucm9vbVNpemUgLyAyKSwgLTAuMDEpO1xyXG4gICAgICAgICAgICBuZWlnaGJvdXJXLnBvc2l0aW9uVXBkYXRlZCA9IHRydWU7XHJcbiAgICAgICAgICAgIG1vdmVSb29tVG9Xb3JsZENvb3JkcyhuZWlnaGJvdXJXKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIHN3aXRjaFJvb20oX2RpcmVjdGlvbjogSW50ZXJmYWNlcy5JUm9vbUV4aXRzKSB7XHJcbiAgICAgICAgaWYgKEdhbWUuY3VycmVudFJvb20uZW5lbXlDb3VudE1hbmFnZXIuZmluaXNoZWQpIHtcclxuICAgICAgICAgICAgbGV0IG5ld1Jvb206IFJvb207XHJcbiAgICAgICAgICAgIGxldCBuZXdQb3NpdGlvbjogR2FtZS7Gki5WZWN0b3IyXHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLm5vcnRoKSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55ICsgMSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50UztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoX2RpcmVjdGlvbi5lYXN0KSB7XHJcbiAgICAgICAgICAgICAgICBuZXdSb29tID0gcm9vbXMuZmluZChyb29tID0+IHJvb20uY29vcmRpbmF0ZXMuZXF1YWxzKG5ldyDGki5WZWN0b3IyKEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueCArIDEsIEdhbWUuY3VycmVudFJvb20uY29vcmRpbmF0ZXMueSkpKTtcclxuICAgICAgICAgICAgICAgIG5ld1Bvc2l0aW9uID0gbmV3Um9vbS5nZXRTcGF3blBvaW50VztcclxuXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKF9kaXJlY3Rpb24uc291dGgpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54LCBHYW1lLmN1cnJlbnRSb29tLmNvb3JkaW5hdGVzLnkgLSAxKSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnROO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChfZGlyZWN0aW9uLndlc3QpIHtcclxuICAgICAgICAgICAgICAgIG5ld1Jvb20gPSByb29tcy5maW5kKHJvb20gPT4gcm9vbS5jb29yZGluYXRlcy5lcXVhbHMobmV3IMaSLlZlY3RvcjIoR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy54IC0gMSwgR2FtZS5jdXJyZW50Um9vbS5jb29yZGluYXRlcy55KSkpO1xyXG4gICAgICAgICAgICAgICAgbmV3UG9zaXRpb24gPSBuZXdSb29tLmdldFNwYXduUG9pbnRFO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmIChuZXdSb29tID09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihcIm5vIHJvb20gZm91bmRcIik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGlmIChOZXR3b3JraW5nLmNsaWVudC5pZCA9PSBOZXR3b3JraW5nLmNsaWVudC5pZEhvc3QpIHtcclxuICAgICAgICAgICAgICAgIC8vIEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uID0gbmV3UG9zaXRpb24udG9WZWN0b3IzKEdhbWUuY21wQ2FtZXJhLm10eFBpdm90LnRyYW5zbGF0aW9uLnopO1xyXG5cclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMS5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgICAgIEdhbWUuYXZhdGFyMi5jbXBUcmFuc2Zvcm0ubXR4TG9jYWwudHJhbnNsYXRpb24gPSBuZXdQb3NpdGlvbi50b1ZlY3RvcjMoKTtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgYWRkUm9vbVRvR3JhcGgobmV3Um9vbSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiByZW1vdmVzIGVyeXRoaW5nIHVucmVsaWFibGUgZnJvbSB0aGUgZ3JwYWggYW5kIGFkZHMgdGhlIG5ldyByb29tIHRvIHRoZSBncmFwaCAsIHNlbmRpbmcgaXQgdG8gdGhlIGNsaWVudCAmIHNwYXducyBlbmVtaWVzIGlmIGV4aXN0aW5nIGluIHJvb21cclxuICAgICAqIEBwYXJhbSBfcm9vbSB0aGUgcm9vbSBpdCBzaG91bGQgc3Bhd25cclxuICAgICAqL1xyXG4gICAgZXhwb3J0IGZ1bmN0aW9uIGFkZFJvb21Ub0dyYXBoKF9yb29tOiBSb29tKSB7XHJcbiAgICAgICAgTmV0d29ya2luZy5zZW5kUm9vbSg8SW50ZXJmYWNlcy5JUm9vbT57IGNvb3JkaW5hdGVzOiBfcm9vbS5jb29yZGluYXRlcywgcm9vbVNpemU6IF9yb29tLnJvb21TaXplLCBleGl0czogX3Jvb20uZXhpdHMsIHJvb21UeXBlOiBfcm9vbS5yb29tVHlwZSwgdHJhbnNsYXRpb246IF9yb29tLm10eExvY2FsLnRyYW5zbGF0aW9uIH0pO1xyXG5cclxuICAgICAgICBsZXQgb2xkT2JqZWN0czogR2FtZS7Gki5Ob2RlW10gPSBHYW1lLmdyYXBoLmdldENoaWxkcmVuKCkuZmlsdGVyKGVsZW0gPT4gKCg8YW55PmVsZW0pLnRhZyAhPSBUYWcuVEFHLlBMQVlFUikpO1xyXG4gICAgICAgIG9sZE9iamVjdHMgPSBvbGRPYmplY3RzLmZpbHRlcihlbGVtID0+ICgoPGFueT5lbGVtKS50YWcgIT0gVGFnLlRBRy5VSSkpO1xyXG5cclxuICAgICAgICBvbGRPYmplY3RzLmZvckVhY2goKGVsZW0pID0+IHtcclxuICAgICAgICAgICAgR2FtZS5ncmFwaC5yZW1vdmVDaGlsZChlbGVtKTtcclxuICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgR2FtZS5ncmFwaC5hZGRDaGlsZChfcm9vbSk7XHJcbiAgICAgICAgR2FtZS52aWV3cG9ydC5jYWxjdWxhdGVUcmFuc2Zvcm1zKCk7XHJcbiAgICAgICAgaWYgKE5ldHdvcmtpbmcuY2xpZW50LmlkID09IE5ldHdvcmtpbmcuY2xpZW50LmlkSG9zdCkge1xyXG4gICAgICAgICAgICBfcm9vbS5vbkFkZFRvR3JhcGgoKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIF9yb29tLndhbGxzLmZvckVhY2god2FsbCA9PiB7XHJcbiAgICAgICAgICAgIHdhbGwuc2V0Q29sbGlkZXIoKTtcclxuICAgICAgICAgICAgaWYgKHdhbGwuZG9vciAhPSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgICAgIHdhbGwuZG9vci5zZXRDb2xsaWRlcigpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfSlcclxuXHJcbiAgICAgICAgR2FtZS5jdXJyZW50Um9vbSA9IF9yb29tO1xyXG4gICAgICAgIEVuZW15U3Bhd25lci5zcGF3bk11bHRpcGxlRW5lbWllc0F0Um9vbShHYW1lLmN1cnJlbnRSb29tLmVuZW15Q291bnRNYW5hZ2VyLmdldE1heEVuZW15Q291bnQsIEdhbWUuY3VycmVudFJvb20ubXR4TG9jYWwudHJhbnNsYXRpb24udG9WZWN0b3IyKCkpO1xyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIEVudGl0eSB7XHJcbiAgICBleHBvcnQgbGV0IHR4dFNoYWRvdzogR2FtZS7Gki5UZXh0dXJlSW1hZ2UgPSBuZXcgR2FtZS7Gki5UZXh0dXJlSW1hZ2UoKTtcclxuICAgIGV4cG9ydCBjbGFzcyBTaGFkb3cgZXh0ZW5kcyBHYW1lLsaSLk5vZGUge1xyXG4gICAgICAgIHByaXZhdGUgbWVzaDogxpIuTWVzaFF1YWQgPSBuZXcgxpIuTWVzaFF1YWQ7XHJcbiAgICAgICAgcHJpdmF0ZSBzaGFkb3dNYXR0OiDGki5NYXRlcmlhbCA9IG5ldyDGki5NYXRlcmlhbChcInN0YXJ0Um9vbU1hdFwiLCDGki5TaGFkZXJMaXRUZXh0dXJlZCwgbmV3IMaSLkNvYXRSZW1pc3NpdmVUZXh0dXJlZCjGki5Db2xvci5DU1MoXCJ3aGl0ZVwiKSwgdHh0U2hhZG93KSk7XHJcbiAgICAgICAgc2hhZG93UGFyZW50OiBHYW1lLsaSLk5vZGU7XHJcbiAgICAgICAgY29uc3RydWN0b3IoX3BhcmVudDogR2FtZS7Gki5Ob2RlKSB7XHJcbiAgICAgICAgICAgIHN1cGVyKFwic2hhZG93XCIpO1xyXG4gICAgICAgICAgICB0aGlzLnNoYWRvd1BhcmVudCA9IF9wYXJlbnQ7XHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KG5ldyBHYW1lLsaSLkNvbXBvbmVudE1lc2godGhpcy5tZXNoKSk7XHJcbiAgICAgICAgICAgIGxldCBjbXBNYXRlcmlhbDogxpIuQ29tcG9uZW50TWF0ZXJpYWwgPSBuZXcgxpIuQ29tcG9uZW50TWF0ZXJpYWwodGhpcy5zaGFkb3dNYXR0KTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuYWRkQ29tcG9uZW50KGNtcE1hdGVyaWFsKTtcclxuICAgICAgICAgICAgdGhpcy5hZGRDb21wb25lbnQobmV3IEdhbWUuxpIuQ29tcG9uZW50VHJhbnNmb3JtKCkpO1xyXG4gICAgICAgICAgICB0aGlzLm10eFdvcmxkLnRyYW5zbGF0aW9uID0gbmV3IEdhbWUuxpIuVmVjdG9yMyhfcGFyZW50Lm10eExvY2FsLnRyYW5zbGF0aW9uLngsIF9wYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueSwgLTAuMDEpO1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnNjYWxpbmcgPSBuZXcgR2FtZS7Gki5WZWN0b3IzKDIsIDIsIDIpO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgdXBkYXRlU2hhZG93UG9zKCkge1xyXG4gICAgICAgICAgICB0aGlzLm10eExvY2FsLnRyYW5zbGF0aW9uID0gbmV3IMaSLlZlY3RvcjMoMCwgMCwgdGhpcy5zaGFkb3dQYXJlbnQubXR4TG9jYWwudHJhbnNsYXRpb24ueiotMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59IiwibmFtZXNwYWNlIFdlYXBvbnMge1xyXG4gICAgZXhwb3J0IGNsYXNzIFdlYXBvbiB7XHJcbiAgICAgICAgb3duZXJOZXRJZDogbnVtYmVyOyBnZXQgb3duZXIoKTogRW50aXR5LkVudGl0eSB7IHJldHVybiBHYW1lLmVudGl0aWVzLmZpbmQoZWxlbSA9PiBlbGVtLm5ldElkID09IHRoaXMub3duZXJOZXRJZCkgfTtcclxuICAgICAgICBwcm90ZWN0ZWQgY29vbGRvd246IEFiaWxpdHkuQ29vbGRvd247IGdldCBnZXRDb29sRG93bigpIHsgcmV0dXJuIHRoaXMuY29vbGRvd24gfTtcclxuICAgICAgICBwcm90ZWN0ZWQgYXR0YWNrQ291bnQ6IG51bWJlcjsgZ2V0IGdldEF0dGFja0NvdW50KCkgeyByZXR1cm4gdGhpcy5hdHRhY2tDb3VudCB9O1xyXG4gICAgICAgIHB1YmxpYyBjdXJyZW50QXR0YWNrQ291bnQ6IG51bWJlcjtcclxuICAgICAgICBhaW1UeXBlOiBBSU07XHJcbiAgICAgICAgYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFID0gQnVsbGV0cy5CVUxMRVRUWVBFLlNUQU5EQVJEO1xyXG4gICAgICAgIHByb2plY3RpbGVBbW91bnQ6IG51bWJlciA9IDE7XHJcbiAgICAgICAgY2FuU2hvb3QgPSB0cnVlO1xyXG5cclxuICAgICAgICBjb25zdHJ1Y3RvcihfY29vbGRvd25UaW1lOiBudW1iZXIsIF9hdHRhY2tDb3VudDogbnVtYmVyLCBfYnVsbGV0VHlwZTogQnVsbGV0cy5CVUxMRVRUWVBFLCBfcHJvamVjdGlsZUFtb3VudDogbnVtYmVyLCBfb3duZXJOZXRJZDogbnVtYmVyLCBfYWltVHlwZTogQUlNKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYXR0YWNrQ291bnQgPSBfYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgIHRoaXMuY3VycmVudEF0dGFja0NvdW50ID0gX2F0dGFja0NvdW50O1xyXG4gICAgICAgICAgICB0aGlzLmJ1bGxldFR5cGUgPSBfYnVsbGV0VHlwZTtcclxuICAgICAgICAgICAgdGhpcy5wcm9qZWN0aWxlQW1vdW50ID0gX3Byb2plY3RpbGVBbW91bnQ7XHJcbiAgICAgICAgICAgIHRoaXMub3duZXJOZXRJZCA9IF9vd25lck5ldElkO1xyXG4gICAgICAgICAgICB0aGlzLmFpbVR5cGUgPSBfYWltVHlwZTtcclxuXHJcbiAgICAgICAgICAgIHRoaXMuY29vbGRvd24gPSBuZXcgQWJpbGl0eS5Db29sZG93bihfY29vbGRvd25UaW1lKTtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIHB1YmxpYyBzaG9vdChfcG9zaXRpb246IMaSLlZlY3RvcjIsIF9kaXJlY2l0b246IMaSLlZlY3RvcjMsIF9idWxsZXROZXRJZD86IG51bWJlciwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIGlmICh0aGlzLmNhblNob290KSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA9IHRoaXMuYXR0YWNrQ291bnQ7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLmN1cnJlbnRBdHRhY2tDb3VudCA+IDAgJiYgIXRoaXMuY29vbGRvd24uaGFzQ29vbERvd24pIHtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgPCAxMDApIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuaW5hY2N1cmFjeShfZGlyZWNpdG9uKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgICAgICAgICAgICAgX2RpcmVjaXRvbi5ub3JtYWxpemUoKTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IHRoaXMubG9hZE1hZ2F6aW5lKF9wb3NpdGlvbiwgX2RpcmVjaXRvbiwgdGhpcy5idWxsZXRUeXBlLCBfYnVsbGV0TmV0SWQpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLnNldEJ1bGxldERpcmVjdGlvbihtYWdhemluZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmN1cnJlbnRBdHRhY2tDb3VudC0tO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5jdXJyZW50QXR0YWNrQ291bnQgPD0gMCAmJiAhdGhpcy5jb29sZG93bi5oYXNDb29sRG93bikge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgdGhpcy5jb29sZG93bi5zZXRNYXhDb29sRG93biA9IHRoaXMuY29vbGRvd24uZ2V0TWF4Q29vbERvd24gKiB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuY29vbERvd25SZWR1Y3Rpb247XHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvb2xkb3duLnN0YXJ0Q29vbERvd24oKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIF9kaXJlY2l0b24ubm9ybWFsaXplKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgbGV0IG1hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdID0gdGhpcy5sb2FkTWFnYXppbmUoX3Bvc2l0aW9uLCBfZGlyZWNpdG9uLCB0aGlzLmJ1bGxldFR5cGUsIF9idWxsZXROZXRJZCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zZXRCdWxsZXREaXJlY3Rpb24obWFnYXppbmUpO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmlyZShtYWdhemluZSwgX3N5bmMpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBpbmFjY3VyYWN5KF9kaXJlY2l0b246IMaSLlZlY3RvcjMpIHtcclxuICAgICAgICAgICAgX2RpcmVjaXRvbi54ID0gX2RpcmVjaXRvbi54ICsgTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5IC0gTWF0aC5yYW5kb20oKSAqIDEwIC8gdGhpcy5vd25lci5hdHRyaWJ1dGVzLmFjY3VyYWN5O1xyXG4gICAgICAgICAgICBfZGlyZWNpdG9uLnkgPSBfZGlyZWNpdG9uLnkgKyBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3kgLSBNYXRoLnJhbmRvbSgpICogMTAgLyB0aGlzLm93bmVyLmF0dHJpYnV0ZXMuYWNjdXJhY3k7XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmaXJlKF9tYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSwgX3N5bmM/OiBib29sZWFuKSB7XHJcbiAgICAgICAgICAgIF9tYWdhemluZS5mb3JFYWNoKGJ1bGxldCA9PiB7XHJcbiAgICAgICAgICAgICAgICBHYW1lLmdyYXBoLmFkZENoaWxkKGJ1bGxldCk7XHJcbiAgICAgICAgICAgICAgICBpZiAoX3N5bmMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoYnVsbGV0IGluc3RhbmNlb2YgQnVsbGV0cy5Ib21pbmdCdWxsZXQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkLCAoPEJ1bGxldHMuSG9taW5nQnVsbGV0PmJ1bGxldCkudGFyZ2V0KTtcclxuXHJcbiAgICAgICAgICAgICAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgTmV0d29ya2luZy5zcGF3bkJ1bGxldCh0aGlzLmFpbVR5cGUsIGJ1bGxldC5kaXJlY3Rpb24sIGJ1bGxldC5uZXRJZCwgdGhpcy5vd25lck5ldElkKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pXHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBzZXRCdWxsZXREaXJlY3Rpb24oX21hZ2F6aW5lOiBCdWxsZXRzLkJ1bGxldFtdKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX21hZ2F6aW5lLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgY2FzZSAxOlxyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBfbWFnYXppbmU7XHJcbiAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgX21hZ2F6aW5lWzBdLm10eExvY2FsLnJvdGF0ZVooNDUgLyAyKTtcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMV0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIgKiAtMSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgICAgICAgICBfbWFnYXppbmVbMF0ubXR4TG9jYWwucm90YXRlWig0NSAvIDIpO1xyXG4gICAgICAgICAgICAgICAgICAgIF9tYWdhemluZVsxXS5tdHhMb2NhbC5yb3RhdGVaKDQ1IC8gMiAqIC0xKTtcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIF9tYWdhemluZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgbG9hZE1hZ2F6aW5lKF9wb3NpdGlvbjogxpIuVmVjdG9yMiwgX2RpcmVjdGlvbjogxpIuVmVjdG9yMywgX2J1bGxldFR5cGU6IEJ1bGxldHMuQlVMTEVUVFlQRSwgX25ldElkPzogbnVtYmVyKTogQnVsbGV0cy5CdWxsZXRbXSB7XHJcbiAgICAgICAgICAgIGxldCBtYWdhemluZTogQnVsbGV0cy5CdWxsZXRbXSA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKGxldCBpID0gMDsgaSA8IHRoaXMucHJvamVjdGlsZUFtb3VudDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBzd2l0Y2ggKHRoaXMuYWltVHlwZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgQUlNLk5PUk1BTDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbWFnYXppbmUucHVzaChuZXcgQnVsbGV0cy5CdWxsZXQodGhpcy5idWxsZXRUeXBlLCBfcG9zaXRpb24sIF9kaXJlY3Rpb24sIHRoaXMub3duZXJOZXRJZCwgX25ldElkKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSBBSU0uSE9NSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBtYWdhemluZS5wdXNoKG5ldyBCdWxsZXRzLkhvbWluZ0J1bGxldCh0aGlzLmJ1bGxldFR5cGUsIF9wb3NpdGlvbiwgX2RpcmVjdGlvbiwgdGhpcy5vd25lck5ldElkLCBudWxsLCBfbmV0SWQpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIG1hZ2F6aW5lO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBleHBvcnQgZW51bSBBSU0ge1xyXG4gICAgICAgIE5PUk1BTCxcclxuICAgICAgICBIT01JTkdcclxuICAgIH1cclxuXHJcbn0iXX0=