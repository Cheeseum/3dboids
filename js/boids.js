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
        return this.add(this, other.multiply(-1));
    }

    multiply(mul) {
        return new Vector3(
            this.x * mul,
            this.y * mul,
            this.z * mul
        );
    }

    magnitude() {
        return Math.sqrt(
            Math.pow(this.x, 2) +
            Math.pow(this.y, 2) +
            Math.pow(this.z, 2)
        );
    }

    normalize() {
        var m = this.magnitude();
        if (m == 0) { m = 1 }
        return new Vector3(this.x / m, this.y / m, this.z / m);
    }

    distanceTo(other) {
        return Math.sqrt(
            Math.pow(Math.abs(this.x - other.x), 2) +
            Math.pow(Math.abs(this.y - other.y), 2) +
            Math.pow(Math.abs(this.z - other.z), 2)
        );
    }

    clamp(x, y, z) {
        return new Vector3(
            Math.max(Math.min(this.x, x), -x),
            Math.max(Math.min(this.y, y), -y),
            Math.max(Math.min(this.z, z), -z)
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
        //this.velocity = new Vector3(
        //    Math.random() * 200 - 100,
        //    Math.random() * 200 - 100,
        //    Math.random() * 200 - 100
        //);
        this.velocity = new Vector3(0,0,0);
        this.acceleration = new Vector3(0,0,0);
    }

    step(t, dt) {
        var neighbors = [];
        var flockMass = new Vector3(0,0,0);
        var flockAvoid = new Vector3(0,0,0);
        var flockHeading = new Vector3(0,0,0);

        for (var i=0; i < this.world.entities.length; ++i) {
            var e = this.world.entities[i];
            
            // calculate the local center of geometry
            var d = this.pos.distanceTo(e.pos);
            if (d > 0 && d < 250) {
                neighbors.push(e);
                flockMass = flockMass.add(e.pos);
                flockAvoid = flockAvoid.add(e.pos.subtract(this.pos).normalize().multiply(5));
                flockHeading = flockHeading.add(e.velocity);
                
            }
        }

        // local center of geometry
        flockMass = flockMass.multiply(1/neighbors.length);
        if (neighbors.length > 0) {
            // if we have neighbors, accelerate to the local CoG
            flockMass = flockMass.multiply(1/neighbors.length);
            //this.acceleration = (flockMass.subtract(this.pos)).normalize().multiply(-Math.pow(10, 5) / Math.pow(this.pos.distanceTo(flockMass), 2));
            this.acceleration = flockMass.subtract(this.pos).normalize().multiply(-10);
            this.acceleration = this.acceleration.add(flockAvoid);
            this.acceleration = this.acceleration.add(flockHeading.normalize().multiply(50));
        }
        
        // bounds of the world (sphere)
        if (this.pos.magnitude() > this.world.radius) {
            this.acceleration = this.acceleration.add(this.pos.normalize().multiply(-1 * Math.pow(this.pos.magnitude() - this.world.radius, 2)));
        }

        // euler approx motion TODO: RK4
        this.velocity = this.velocity.add(this.acceleration.multiply(dt)).clamp(50, 50, 50);
        this.pos = this.pos.add(this.velocity.multiply(dt));
    }
}

// TODO: behavior objects, componentize or mutate onto each boid

class World { 
    constructor() {
        this.entities = [];
        this.radius = 1500;
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
    constructor(world) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( window.innerWidth, window.innerHeight );

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 5000 );
        this.camera.position.z = 1000;

        this.world = world;
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
        //this.scene.children.forEach((o) => this.scene.remove(o));
        for (var i=0; i < this.world.entities.length; ++i) {
            this.drawEntity(this.world.entities[i]);
        }
    }

    drawEntity(e) {
    }
}

class ThreeJSBoidsRenderer extends ThreeJSRenderer {
    constructor(world) {
        super(world)

        this.camera.position.z = this.world.radius * 1.2;

        this.boidGeometry = new THREE.CylinderGeometry(0.1, 15, 20, 4);
        this.boidMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );

        var l = new THREE.DirectionalLight( 0xffffff, 0.5 );
        l.position.set(0, 1, 0);
        this.scene.add(l);

        this.scene.add(new THREE.Mesh(
            new THREE.SphereGeometry(this.world.radius),
            new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } )
        ));
    }

    drawEntity(e) {
        if (e.mesh == undefined) {
            e.mesh = new THREE.Mesh( this.boidGeometry, this.boidMaterial );
        }
        
        this.scene.add(e.mesh);
        e.mesh.position.x = e.pos.x;
        e.mesh.position.y = e.pos.y;
        e.mesh.position.z = e.pos.z;

        var v = e.velocity.normalize();
        e.mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(v.x, v.y, v.z)
        );
    }
}
    


function runBoids () {
    var sim = new Simulator();
    var world = new World();

    for (var i=0; i < 250; ++i) {
        var b = new Boid(world);
        b.pos = new Vector3(
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000,
            Math.random() * 2000 - 1000
        );
        world.entities.push(b);
    }

    sim.world = world;
    sim.step();

    var rend = new ThreeJSBoidsRenderer(world);
    document.body.appendChild(rend.renderer.domElement);

    rend.draw();

    var controls = new THREE.OrbitControls(rend.camera);
}


window.onload = function() {
    runBoids(null);
};
