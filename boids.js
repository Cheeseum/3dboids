class Vector2 {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    add(other) {
        return new Vector2(
            this.x + other.x,
            this.y + other.y
        );
    }

    subtract(other) {
        return add(this, other.multiply(-1));
    }

    multiply(mul) {
        return new Vector2(
            this.x * mul,
            this.y * mul
        );
    }
}

class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    add(other) {
        return new Vector3(
            this.x + other.x,
            this.y + other.y,
            this.z + other.z
        );
    }

    subtract(other) {
        return add(this, other.multiply(-1));
    }

    multiply(mul) {
        return new Vector3(
            this.x * mul,
            this.y * mul,
            this.z * mul
        );
    }
}

class Entity {
    constructor(world) {
        this.world = world;
        this.pos = new Vector3(0, 0, 0);
    }

    step(t, dt) {
    }
}

class Boid extends Entity {
    constructor(world) {
        super(world);
        this.velocity = new Vector3(
            Math.random() * 200 - 100,
            Math.random() * 200 - 100,
            Math.random() * 200 - 100
        );
    }

    step(t, dt) {
        this.pos = this.pos.add(this.velocity.multiply(dt));

    }
}

class World { 
    constructor() {
        this.entities = [];
    }

    step(t, dt) {
        for (var i=0; i < this.entities.length; ++i) {
            var e = this.entities[i];
            e.step(t, dt);
        }
    }
}

class Simulator {
    constructor() {
        this.world = null;

        this.old_time = 0.0;
        this.new_time = 0.0;
        this.accumulator = 0.0;
        this.t = 0.0;
        this.dt = 0.01;
    }
    
    step() {
        this.old_time = this.new_time;
        this.new_time = Date.now() / 1000;
        this.accumulator += Math.min(this.dt * 10, this.new_time - this.old_time);
        
        while (this.accumulator >= this.dt) {
            this.world.step(this.t, this.dt);

            this.accumulator -= this.dt;
            this.t += this.dt;
        }

        window.setTimeout(() => { this.step() }, 0);
    }

}

/* global THREE from three.min.js */
class ThreeJSRenderer {
    constructor() {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 1, 10000 );
        this.camera.position.z = 1000;

        this.world = null;
        this.fps = 0.0;

    }

    draw() {
        window.requestAnimFrame(() => { this.draw.call(this) });
        
        this.drawWorld();

        this.renderer.render(this.scene, this.camera)

        // fps calculation
        // frame_time is calculated as time since last render
        this.frame_time = (Date.now() - this.frame_time) / 1000;
        this.last_frame = this.frame_time;

        this.fps = Math.round(1 / (this.last_frame * 0.7 + this.frame_time * 0.3));

        this. frame_time = Date.now();
    }

    drawWorld() {
        this.scene.children.forEach((o) => this.scene.remove(o));
        for (var i=0; i < this.world.entities.length; ++i) {
            this.drawEntity(this.world.entities[i]);
        }
    }

    drawEntity(e) {
    }
}

class ThreeJSBoidsRenderer extends ThreeJSRenderer {
    constructor() {
        super()

        this.boidGeometry = new THREE.BoxGeometry( 200, 200, 200 );
        this.boidMaterial = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
    }

    drawEntity(e) {
        if (e.mesh == undefined) {
            e.mesh = new THREE.Mesh( this.boidGeometry, this.boidMaterial );
        }
        
        this.scene.add(e.mesh);
        e.mesh.position.x = e.pos.x;
        e.mesh.position.y = e.pos.y;
        e.mesh.position.z = e.pos.z;
    }
}
    


function runBoids () {
    var sim = new Simulator();
    var world = new World();

    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    world.entities.push(new Boid());
    sim.world = world;
    sim.step();

    var rend = new ThreeJSBoidsRenderer();
    rend.world = world;
    document.body.appendChild(rend.renderer.domElement);

    rend.draw();
}


window.onload = function() {
    runBoids(null);
};
