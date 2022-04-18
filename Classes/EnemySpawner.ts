namespace EnemySpawner {
    let spawnTime: number = 0 * Game.frameRate;
    let currentTime: number = spawnTime;
    let maxEnemies: number = 0;

    export function spawnEnemies(): void {
        let currentRoom = (<Generation.Room>Game.graph.getChildren().find(elem => (<Generation.Room>elem).tag == Tag.TAG.ROOM));
        maxEnemies = currentRoom.enemyCount;
        while (maxEnemies > 0) {
            maxEnemies = currentRoom.enemyCount;
            if (currentTime == spawnTime) {
                let position = new ƒ.Vector2((Math.random() * 7 - (Math.random() * 7)) * 2, (Math.random() * 7 - (Math.random() * 7) * 2));
                position.add(currentRoom.mtxLocal.translation.toVector2());
                console.log(position);
                spawnByID(Entity.ID.REDTICK, position);
                currentRoom.enemyCount--;
            }
            currentTime--;
            if (currentTime <= 0) {
                currentTime = spawnTime;
            }
        }
    }


    export function spawnByID(_id: Entity.ID, _position: ƒ.Vector2, _attributes?: Entity.Attributes, _netID?: number) {
        let enemy: Enemy.Enemy;
        switch (_id) {
            case Entity.ID.BAT:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "bat");
                    enemy = new Enemy.EnemyDumb(Entity.ID.BAT, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, ref.attributes.scale, Math.random() * ref.attributes.knockbackForce + 0.5), _position, _netID);
                } else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.BAT, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.REDTICK:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "redtick");
                    enemy = new Enemy.EnemyDumb(Entity.ID.REDTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * ref.attributes.scale + 0.5, ref.attributes.knockbackForce), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.REDTICK, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.SMALLTICK:
                if (_attributes == null && _netID == null) {
                    const ref = Game.enemiesJSON.find(enemy => enemy.name == "smalltick");
                    enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, new Entity.Attributes(ref.attributes.healthPoints, ref.attributes.attackPoints, ref.attributes.speed, Math.random() * ref.attributes.scale + 0.5, ref.attributes.knockbackForce), _position, _netID);
                }
                else {
                    enemy = new Enemy.EnemyDumb(Entity.ID.SMALLTICK, _attributes, _position, _netID);
                }
                break;
            case Entity.ID.SKELETON:
                break;
        }
        if (enemy != null) {
            Game.graph.addChild(enemy);
        }
    }

    export function networkSpawnById(_id: Entity.ID, _position: ƒ.Vector2, _attributes: Entity.Attributes, _netID: number) {
        spawnByID(_id, _position, _attributes, _netID);
    }

}