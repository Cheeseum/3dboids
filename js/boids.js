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
        this.velocity = new Vector3(0,0,0);
        this.acceleration = new Vector3(0,0,0);

        this.vision = 250;
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
            if (d > 0 && d < this.vision) {
                neighbors.push(e);
                flockMass = flockMass.add(e.pos);
                flockAvoid = flockAvoid.add(this.pos.subtract(e.pos).normalize().multiply(1/(d*d)));
                flockHeading = flockHeading.add(e.velocity).multiply(1/(d*d));
                
            }
        }

        // local center of geometry
        flockMass.add(this.pos);
        if (neighbors.length > 0) {
            // if we have neighbors, accelerate to the local CoG
            flockMass = flockMass.multiply(1/(neighbors.length+1));
            this.acceleration = flockMass.subtract(this.pos).normalize().multiply(20 / Math.pow(this.pos.distanceTo(flockMass),2));
            this.acceleration = this.acceleration.add(flockAvoid.normalize().multiply(10));
            this.acceleration = this.acceleration.add(flockHeading.normalize().multiply(15));
        }
        
        // bounds of the world (sphere)
        if (this.pos.magnitude() > this.world.radius) {
            this.velocity = this.velocity.add(this.pos.normalize().multiply(-1 * Math.log(this.pos.magnitude() - this.world.radius + 1)));
        }
    
        // euler approx motion TODO: RK4
        this.velocity = this.velocity.add(this.acceleration.multiply(dt)).clamp(200, 200, 200);
        this.pos = this.pos.add(this.velocity.multiply(dt));
    }
}

// TODO: behavior objects, componentize or mutate onto each boid

class World { 
    constructor() {
        this.entities = [];
        this.radius = 2500;

        this.octree = new Octree(this.radius*2);
    }

    step(t, dt) {
        this.octree = new Octree(this.radius*2);
        for (var i=0; i < this.entities.length; ++i) {
            this.octree.insert(this.entities[i]);
        }

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

        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 15000 );
        this.camera.position.z = 1000;

        this.world = world;
        this.fps = 0.0;
        
        this.octreeMat = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
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

        //FIXME: this flag doesn't belong here
        var renderOct = false;
        if (renderOct) {
            var nodes = this.world.octree.getNodes();
            for (var i=0; i < nodes.length; ++i) {
                var node = nodes[i];
                if (node.mesh == undefined) {
                    node.mesh = new THREE.Mesh(
                        new THREE.BoxGeometry(node.size, node.size, node.size),
                        this.octreeMat
                    );
                    node.mesh.position.x = node.center.x;
                    node.mesh.position.y = node.center.y;
                    node.mesh.position.z = node.center.z;

                    this.scene.add(node.mesh);
                }
            }
        }

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
            e.mesh = new THREE.Mesh(this.boidGeometry, this.boidMaterial);
            this.scene.add(e.mesh);
        }
        
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

    for (var i=0; i < 200; ++i) {
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

    // expose the simulator for debugging
    window.sim = sim;
}


window.onload = function() {
    runBoids(null);
};
