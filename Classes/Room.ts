namespace Generation {
    export enum ROOMTYPE {
        START,
        NORMAL,
        MERCHANT,
        TREASURE,
        CHALLENGE,
        BOSS
    }

    export class EnemyCountManager {
        private maxEnemyCount: number; get getMaxEnemyCount(): number { return this.maxEnemyCount };
        private currentEnemyCount: number; get getCurrentEnemyCount(): number { return this.currentEnemyCount };
        public finished: boolean;
        public setFinished: boolean;

        constructor(_enemyCount: number, _setFinished: boolean) {
            this.maxEnemyCount = _enemyCount;
            this.currentEnemyCount = _enemyCount;
            this.finished = false;
            this.setFinished = _setFinished;
            if (_enemyCount <= 0) {
                if (this.setFinished) {
                    this.finished = true;
                }
            }
        }

        public onEnemyDeath() {
            this.currentEnemyCount--;
            if (this.currentEnemyCount <= 0) {
                if (this.setFinished) {
                    this.finished = true;
                }
            }
        }
    }
    export let txtStartRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtNormalRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtBossRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtMerchantRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtTreasureRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtChallengeRoom: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();

    export abstract class Room extends ƒ.Node {
        public tag: Tag.TAG;
        public roomType: ROOMTYPE;
        public coordinates: Game.ƒ.Vector2;
        public walls: Wall[] = [];
        public obsticals: Obsitcal[] = [];
        public enemyCountManager: EnemyCountManager;
        public positionUpdated: boolean = false;
        public exitDoor: Door;
        roomSize: number = 30;
        exits: Interfaces.IRoomExits; // N E S W
        mesh: ƒ.MeshQuad = new ƒ.MeshQuad;
        cmpMesh: ƒ.ComponentMesh = new ƒ.ComponentMesh(this.mesh);
        protected avatarSpawnPointN: Game.ƒ.Vector2; get getSpawnPointN(): Game.ƒ.Vector2 { return this.avatarSpawnPointN };
        protected avatarSpawnPointE: Game.ƒ.Vector2; get getSpawnPointE(): Game.ƒ.Vector2 { return this.avatarSpawnPointE };
        protected avatarSpawnPointS: Game.ƒ.Vector2; get getSpawnPointS(): Game.ƒ.Vector2 { return this.avatarSpawnPointS };
        protected avatarSpawnPointW: Game.ƒ.Vector2; get getSpawnPointW(): Game.ƒ.Vector2 { return this.avatarSpawnPointW };

        protected cmpMaterial: ƒ.ComponentMaterial = new ƒ.ComponentMaterial();

        constructor(_coordiantes: Game.ƒ.Vector2, _roomSize: number, _roomType: ROOMTYPE) {
            super("room");
            this.tag = Tag.TAG.ROOM;
            this.coordinates = _coordiantes;
            this.enemyCountManager = new EnemyCountManager(0, true);
            if (_roomSize != undefined) {
                this.roomSize = _roomSize;
            }
            if (_roomType != undefined) {
                this.roomType = _roomType;
            }
            this.exits = <Interfaces.IRoomExits>{ north: false, east: false, south: false, west: false }
            this.addComponent(new ƒ.ComponentTransform());
            this.cmpTransform.mtxLocal.scaling = new ƒ.Vector3(this.roomSize, this.roomSize, 1);
            this.addComponent(this.cmpMesh);
            this.addComponent(this.cmpMaterial);
            this.cmpTransform.mtxLocal.translation = new ƒ.Vector3(0, 0, -0.01);

            this.addWalls();
            this.addEventListener(Game.ƒ.EVENT.RENDER_PREPARE, this.eventUpdate)
        }

        protected eventUpdate = (_event: Event): void => {
            this.update();
        }
        public onAddToGraph() {

        }
        public update(): void {

        }

        private addWalls(): void {
            let offset: number = 0.499 + 1 / this.roomSize / 2;

            let newWall: Wall = (new Wall(new ƒ.Vector2(offset, 0), new ƒ.Vector2(1 / this.roomSize, offset * 2 + 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtWallWest));
            this.addChild(newWall);

            newWall = (new Wall(new ƒ.Vector2(0, offset), new ƒ.Vector2(1 + 0.8 / this.roomSize, 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtWallSouth));
            this.addChild(newWall);
            newWall.mtxLocal.translateZ(0.00001);

            newWall = (new Wall(new ƒ.Vector2(-offset, 0), new ƒ.Vector2(1 / this.roomSize, offset * 2 + 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtWallEast));
            this.addChild(newWall);

            newWall = (new Wall(new ƒ.Vector2(0, -offset), new ƒ.Vector2(1 + 0.8 / this.roomSize, 1 / this.roomSize), this));
            newWall.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtWallNorth));
            this.addChild(newWall);
            newWall.mtxLocal.translateZ(0.00001);

            this.getChildren().filter(elem => (<Wall>elem).tag == Tag.TAG.WALL).forEach(wall => {
                this.walls.push((<Wall>wall));
            })
        }

        public setSpawnPoints() {
            this.avatarSpawnPointE = new ƒ.Vector2(this.mtxLocal.translation.x + ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointW = new ƒ.Vector2(this.mtxLocal.translation.x - ((this.roomSize / 2) - 2), this.mtxLocal.translation.y);
            this.avatarSpawnPointN = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y + ((this.roomSize / 2) - 2));
            this.avatarSpawnPointS = new ƒ.Vector2(this.mtxLocal.translation.x, this.mtxLocal.translation.y - ((this.roomSize / 2) - 2));
        }

        public getRoomSize(): number {
            return this.roomSize;
        }

        public setRoomExit(_neighbour: Room) {
            let dif = Game.ƒ.Vector2.DIFFERENCE(_neighbour.coordinates, this.coordinates)
            if (dif.equals(compareNorth)) {
                this.exits.north = true;
            }
            if (dif.equals(compareEast)) {
                this.exits.east = true;
            }
            if (dif.equals(compareSouth)) {
                this.exits.south = true;
            }
            if (dif.equals(compareWest)) {
                this.exits.west = true;
            }
        }

        public openDoors() {
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

    export class StartRoom extends Room {
        private startRoomMat: ƒ.Material = new ƒ.Material("startRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtStartRoom));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.START);

            this.getComponent(Game.ƒ.ComponentMaterial).material = this.startRoomMat;
        }
    }

    export class NormalRoom extends Room {
        normalRoomMat: ƒ.Material = new ƒ.Material("normalRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtNormalRoom));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.NORMAL);
            this.enemyCountManager = new EnemyCountManager(15, true);

            this.getComponent(Game.ƒ.ComponentMaterial).material = this.normalRoomMat;
        }
    }

    export class BossRoom extends Room {
        boss: Enemy.Enemy;
        bossRoomMat: ƒ.Material = new ƒ.Material("bossRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtBossRoom));
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.BOSS);

            this.enemyCountManager = new EnemyCountManager(0, false);

            this.exitDoor = new ExitDoor();
            this.addChild(this.exitDoor);
            this.exitDoor.mtxLocal.translateZ(-0.099);
            this.exitDoor.mtxLocal.scale(Game.ƒ.Vector3.ONE(0.1));
            this.exitDoor.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorExit));

            this.getComponent(Game.ƒ.ComponentMaterial).material = this.bossRoomMat;
        }

        public update(): void {
            super.update();
            if (this.enemyCountManager.finished == true) {
                this.exitDoor.activate(true);
                this.exitDoor.setCollider();
            }
        }

        public done(): void {
            this.enemyCountManager.finished = true;
        }

        public onAddToGraph(): void {
            if (this.boss == undefined) {
                this.boss = this.getRandomBoss();
            }
            if (this.boss != undefined) {
                if (!this.enemyCountManager.finished) {
                    Game.graph.addChild(this.boss);
                    Networking.spawnEnemy(Enemy.getEnemyClass(this.boss), this.boss, this.boss.netId);
                }
            }
        }

        private getRandomBoss(): Enemy.Enemy {
            if (Game.runs % 3 == 0) {
                return new Enemy.Summonor(Entity.ID.SUMMONER, this.mtxWorld.translation.toVector2());
            }
            else {
                return new Enemy.BigBoom(Entity.ID.BIGBOOM, this.mtxWorld.translation.toVector2());
            }
        }
    }

    export class TreasureRoom extends Room {
        private treasureRoomMat: ƒ.Material = new ƒ.Material("treasureRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtTreasureRoom));
        private spawnChance: number = 25; get getSpawnChance(): number { return this.spawnChance };
        private treasureCount: number = 2;
        private treasures: Items.Item[] = [];
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.TREASURE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.treasureRoomMat;
            if (Networking.client.id == Networking.client.idHost) {
                this.createTreasures();
            }
        }

        private createTreasures() {
            let treasures: Items.Item[] = [];
            for (let i = 0; i < this.treasureCount; i++) {
                treasures.push(Items.ItemGenerator.getRandomItem());
            }
            this.treasures = treasures;
        }

        public onAddToGraph(): void {
            let i: number = 0;
            this.treasures.forEach(item => {
                item.setPosition(new ƒ.Vector2(this.mtxLocal.translation.x + i, this.mtxLocal.translation.y))
                item.spawn();
                i++;
            })
        }

        public onItemCollect(_item: Items.Item) {
            if (this.treasures.find(item => item == _item) != undefined) {
                this.treasures.splice(this.treasures.indexOf(_item), 1);
            }
        }

    }

    export class MerchantRoom extends Room {
        private merchantRoomMat: ƒ.Material = new ƒ.Material("merchantRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtMerchantRoom));
        private merchant: Entity.Merchant = new Entity.Merchant(Entity.ID.MERCHANT);
        private items: Items.Item[] = [];
        private itemsSpawnPoints: ƒ.Vector2[] = [];
        private itemCount: number = 5;
        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
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

        private createShop() {
            let items: Items.Item[] = [];
            for (let i = 0; i < this.itemCount; i++) {
                items.push(Items.ItemGenerator.getRandomItem());
            }
            this.items = items;
        }

        public onAddToGraph(): void {
            this.createSpawnPoints();

            let i = 0;
            this.items.forEach(item => {
                if (item.getPosition != undefined) {
                    if (this.itemsSpawnPoints.find(pos => pos.equals(item.getPosition)) == undefined) {
                        item.setPosition(this.itemsSpawnPoints[i]);
                    }
                } else {
                    item.setPosition(this.itemsSpawnPoints[i]);
                }
                item.spawn();
                i++;
            })
        }

        private createSpawnPoints() {
            this.itemsSpawnPoints = [];

            let middle = this.mtxWorld.clone.translation;

            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 3, middle.y + 3));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x + 2, middle.y + 1));
            this.itemsSpawnPoints.push(new ƒ.Vector2(middle.x - 2, middle.y + 1));
        }

        public onItemCollect(_item: Items.Item, _avatar: Player.Player): boolean {
            if (this.items.find(item => item == _item) != undefined) {
                return this.shoping(_item, _avatar);
            }
            return false;
        }

        private shoping(_item: Items.Item, _avatar: Player.Player): boolean {
            let sameRarity: Items.Item[] = _avatar.items.filter(item => item.rarity == _item.rarity);
            let lowerRarity: Items.Item[] = [];

            if (_item.rarity != Items.RARITY.COMMON) {
                lowerRarity = _avatar.items.filter(item => item.rarity == (_item.rarity - 1));
            }

            if (sameRarity.length > 0) {
                let index: number = Math.round(Math.random() * (sameRarity.length - 1));
                sameRarity[index].removeItemFromEntity(_avatar);
                this.items.splice(this.items.indexOf(_item), 1);
                Networking.updateInventory(false, sameRarity[index].id, sameRarity[index].netId, _avatar.netId);
            } else {
                if (lowerRarity.length >= 3) {
                    let index1: number = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index1].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index1]), 1);
                    lowerRarity.slice(index1, 1);
                    lowerRarity.splice(index1, 1);
                    Networking.updateInventory(false, lowerRarity[index1].id, lowerRarity[index1].netId, _avatar.netId);

                    let index2: number = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index2].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index2]), 1);
                    lowerRarity.slice(index2, 1);
                    lowerRarity.splice(index2, 1);
                    Networking.updateInventory(false, lowerRarity[index2].id, lowerRarity[index2].netId, _avatar.netId);

                    let index3: number = Math.round(Math.random() * (lowerRarity.length - 1));
                    lowerRarity[index3].removeItemFromEntity(_avatar);
                    lowerRarity.splice(lowerRarity.indexOf(lowerRarity[index3]), 1);
                    lowerRarity.slice(index3, 1);
                    lowerRarity.splice(index3, 1);
                    Networking.updateInventory(false, lowerRarity[index3].id, lowerRarity[index3].netId, _avatar.netId);

                    this.items.splice(this.items.indexOf(_item), 1);
                } else {
                    return false;
                }
            }
            return true;
        }
    }

    enum CHALLENGE {
        THORSHAMMER
    }
    export class ChallengeRoom extends Room {
        challenge: CHALLENGE;
        item: Items.Item;
        challengeRoomMat: ƒ.Material = new ƒ.Material("challengeRoomMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtChallengeRoom));

        constructor(_coordinates: Game.ƒ.Vector2, _roomSize: number) {
            super(_coordinates, _roomSize, ROOMTYPE.CHALLENGE);
            this.getComponent(Game.ƒ.ComponentMaterial).material = this.challengeRoomMat;
            this.challenge = this.randomChallenge();

            this.enemyCountManager.finished = false;
        }

        protected randomChallenge(): CHALLENGE {
            let index: number = Math.round(Math.random() * (Object.keys(CHALLENGE).length / 2 - 1));
            return (<any>CHALLENGE)[CHALLENGE[index]];
        }

        public update(): void {
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
            } else {
                if (Networking.client.id == Networking.client.idHost) {
                    switch (this.challenge) {
                        case CHALLENGE.THORSHAMMER:
                            this.spawnEnemys();
                            break;

                        default:
                            break;
                    }
                }
            }
        }

        public onAddToGraph(): void {
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

        public spawnEnemys() {
            let avatar1Inv = Game.avatar1.items.find(item => item == this.item);
            let avatar2Inv = Game.avatar2.items.find(item => item == this.item);
            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (this.enemyCountManager.getMaxEnemyCount <= 0) {
                    this.enemyCountManager = new EnemyCountManager(10, false);
                    EnemySpawner.spawnMultipleEnemiesAtRoom(this.enemyCountManager.getMaxEnemyCount, this.mtxLocal.translation.toVector2(), Enemy.ENEMYCLASS.ENEMYDASH);
                }
            }
            if (this.enemyCountManager.getMaxEnemyCount > 0 && this.enemyCountManager.getCurrentEnemyCount <= 0) {
                this.enemyCountManager.finished = true;
            }
        }

        protected startThorsHammerChallenge() {
            if (this.enemyCountManager.finished) {
                return;
            }

            Game.avatar1.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar1.netId);
            Game.avatar2.weapon = new Weapons.ThorsHammer(1, Bullets.BULLETTYPE.THORSHAMMER, 1, Game.avatar2.netId);

            Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
            Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);

            let thorshammer: Items.InternalItem = new Items.InternalItem(Items.ITEMID.THORSHAMMER);
            let choosenOne: Player.Player;
            if (Math.round(Math.random()) > 0) {
                choosenOne = Game.avatar1;
            } else {
                choosenOne = Game.avatar2;
            }

            thorshammer.choosenOneNetId = choosenOne.netId;
            thorshammer.setPosition(this.mtxLocal.translation.toVector2());
            thorshammer.spawn();

            this.item = thorshammer;
        }

        protected stopThorsHammerChallenge() {
            let avatar1Inv = Game.avatar1.items.find(item => item.id == Items.ITEMID.THORSHAMMER);
            let avatar2Inv = Game.avatar2.items.find(item => item.id == Items.ITEMID.THORSHAMMER);

            if (avatar1Inv != undefined || avatar2Inv != undefined) {
                if (avatar1Inv != undefined) {
                    Game.avatar1.items.splice(Game.avatar1.items.indexOf(avatar1Inv), 1);
                    Networking.updateInventory(false, avatar1Inv.id, avatar1Inv.netId, Game.avatar1.netId);
                }

                if (avatar2Inv != undefined) {
                    Game.avatar2.items.splice(Game.avatar2.items.indexOf(avatar2Inv), 1);
                    Networking.updateInventory(false, avatar2Inv.id, avatar2Inv.netId, Game.avatar2.netId);
                }
            }

            if (Game.avatar1.weapon instanceof Weapons.ThorsHammer || Game.avatar2.weapon instanceof Weapons.ThorsHammer) {
                Game.avatar1.weapon = (<Weapons.ThorsHammer>Game.avatar1.weapon).weaponStorage;
                Game.avatar2.weapon = (<Weapons.ThorsHammer>Game.avatar2.weapon).weaponStorage;

                Networking.updateAvatarWeapon(Game.avatar1.weapon, Game.avatar1.netId);
                Networking.updateAvatarWeapon(Game.avatar2.weapon, Game.avatar2.netId);
            }

            let roomInv = Game.items.find(item => item.id == Items.ITEMID.THORSHAMMER);

            if (roomInv != undefined) {
                roomInv.despawn();
            }
        }

    }

    export let txtWallNorth: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtWallSouth: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtWallEast: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtWallWest: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export class Wall extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.WALL;
        public collider: Game.ƒ.Rectangle;
        public door: Door;
        private normal: Game.ƒ.Vector3; get getNormal(): Game.ƒ.Vector3 { return this.normal };

        constructor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2, _room: Room) {
            super("Wall");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("red", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("grey")))));

            let newPos = _pos.toVector3(0.01);
            this.mtxLocal.scaling = _scaling.toVector3(1);
            this.mtxLocal.translation = newPos;


            if (_pos.x != 0) {
                if (_pos.x > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(-1, 0, 0);
                } else if (_pos.x < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(1, 0, 0);
                }
            } else {
                if (_pos.y > 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, -1, 0);
                } else if (_pos.y < 0) {
                    this.addDoor(_pos, _scaling);
                    this.normal = new ƒ.Vector3(0, 1, 0);
                }
            }
        }


        addDoor(_pos: Game.ƒ.Vector2, _scaling: Game.ƒ.Vector2) {
            this.door = new Door();
            this.addChild(this.door);

            if (Math.abs(_pos.x) > 0) {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(1, _scaling.x / _scaling.y * 3, 1);
                if (_pos.x > 0) {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: true, south: false, west: false });
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorEast));
                } else {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: false, south: false, west: true });
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorWest));
                }
            } else {
                this.door.mtxLocal.scaling = new Game.ƒ.Vector3(_scaling.y / _scaling.x * 3, 1, 1);
                if (_pos.y > 0) {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: true, east: false, south: false, west: false });
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorNorth));
                } else {
                    this.door.direction = (<Interfaces.IRoomExits>{ north: false, east: false, south: true, west: false });
                    this.door.getComponent(ƒ.ComponentMaterial).material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorSouth));
                }
            }
        }

        setCollider() {
            this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
        }
    }

    export let txtDoorNorth: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtDoorSouth: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtDoorEast: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export let txtDoorWest: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export class Door extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.DOOR;
        public collider: Game.ƒ.Rectangle;

        public direction: Interfaces.IRoomExits;
        private doorMat: ƒ.Material = new ƒ.Material("doorMat", ƒ.ShaderLitTextured, new ƒ.CoatRemissiveTextured(ƒ.Color.CSS("white"), txtDoorNorth));

        constructor() {
            super("Door");

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(this.doorMat));

            this.mtxLocal.translateZ(0.1);
            this.closeDoor();
        }

        setCollider() {
            if (this.isActive) {
                this.collider = new Game.ƒ.Rectangle(this.mtxWorld.translation.x, this.mtxWorld.translation.y, this.mtxWorld.scaling.x, this.mtxWorld.scaling.y, Game.ƒ.ORIGIN2D.CENTER);
            }
        }

        public changeRoom() {
            if (Networking.client.id == Networking.client.idHost) {
                Generation.switchRoom(this.direction);
            } else {
                Networking.switchRoomRequest(this.direction);
            }
        }

        public openDoor() {
            this.activate(true);
        }

        public closeDoor() {
            this.activate(false);
        }
    }

    export let txtDoorExit: Game.ƒ.TextureImage = new Game.ƒ.TextureImage();
    export class ExitDoor extends Door {

        public changeRoom() {
            Game.runs++;

            if (Game.runs % 3 == 0) {
                Game.newGamePlus++;
            }

            if (Networking.client.id == Networking.client.idHost) {
                Generation.procedualRoomGeneration();
            } else {
                Networking.switchRoomRequest(null);
            }
        }
    }

    export class Obsitcal extends ƒ.Node {
        public tag: Tag.TAG = Tag.TAG.OBSTICAL;
        public collider: Collider.Collider;
        public parentRoom: Room;

        direction: Interfaces.IRoomExits;

        constructor(_parent: Room, _position: Game.ƒ.Vector2, _scale: number) {
            super("Obstical");

            this.parentRoom = _parent;
            this.parentRoom.obsticals.push(this);

            this.addComponent(new ƒ.ComponentTransform());
            this.addComponent(new ƒ.ComponentMesh(new ƒ.MeshQuad));
            this.addComponent(new ƒ.ComponentMaterial(new ƒ.Material("black", ƒ.ShaderLit, new ƒ.CoatRemissive(ƒ.Color.CSS("black")))));

            this.mtxLocal.translation = _position.toVector3(0.01);
            this.mtxLocal.scale(Game.ƒ.Vector3.ONE(_scale));

            this.collider = new Collider.Collider(this.mtxLocal.translation.toVector2(), this.mtxLocal.scaling.x / 2, null);
        }
    }
}