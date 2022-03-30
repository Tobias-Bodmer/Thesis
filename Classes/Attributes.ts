namespace Player {
    export class Attributes {

        public healthPoints: number;
        public maxhealthPoints: number;
        public speed: number;
        public attackPoints: number;

        constructor(_healthPoints: number, _attackPoints: number, _speed: number) {
            this.healthPoints = _healthPoints;
            this.maxhealthPoints = _healthPoints;
            this.attackPoints = _attackPoints;
            this.speed = _speed;
        }
    }
}