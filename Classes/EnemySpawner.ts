namespace Enemy {
    export class EnemySpawner {
        spawnPositions: ƒ.Vector2[] = [];
        numberOfENemies: number;


        constructor(_spawPositions: ƒ.Vector2[], _numberOfEnemies: number) {
            this.spawnPositions = _spawPositions;
            this.numberOfENemies = _numberOfEnemies;
        }
    }
}