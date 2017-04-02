class Entity {
    constructor(world) {
        this.world = world;
        this.pos = new Vector3(0, 0, 0);
        this.velocity = new Vector3(0,0,0);
        this.acceleration = new Vector3(0,0,0);

        this.radius = 1;
    }

    step(t, dt) {
    }
}

class Boid extends Entity {
    constructor(world) {
        super(world);
    }

    step(t, dt) {
        var neighbors = this.world.octree.search(this.pos, this.world.behaviorWeights.vision);
        var flockMass = new Vector3(0,0,0);     // local center of geometry
        var flockAvoid = new Vector3(0,0,0);    // heading away from CoG
        var flockHeading = new Vector3(0,0,0);  // average heading of flock

        var collideAvoid = new Vector3(0,0,0); // heading away from obstacles
        
        for (var i=0; i < neighbors.length; ++i) {
            var e = neighbors[i];
            var d = this.pos.distanceTo(e.pos);
            
            if (d - e.radius > 0) {
                if (e instanceof Collidable) {
                    // give a nudge along the normal but in the direction of the current heading
                    // drop the effect off with inverse square of distance to the outer shell
                    collideAvoid = collideAvoid.add(
                        this.pos.subtract(e.pos).multiply(15).add(this.velocity).normalize().multiply(1/((d-e.radius)*(d-e.radius)))
                    );   
                } else {
                    flockMass = flockMass.add(e.pos);
                    
                    // accumulate directions away from neighbors and towards their heading
                    // inverse square distance fall-off in each case 
                    flockAvoid = flockAvoid.add(this.pos.subtract(e.pos).normalize().multiply(1/(d*d)));
                    flockHeading = flockHeading.add(e.velocity).multiply(1/(d*d));
                }
            }
        }

        // local center of geometry
        flockMass.add(this.pos);
        if (neighbors.length > 0) {
            // if we have neighbors, accelerate to the local CoG
            // also modify our acceleration based on each behavior modifying vector
            flockMass = flockMass.multiply(1/(neighbors.length+1));
            this.acceleration = flockMass.subtract(this.pos).normalize().multiply(this.world.behaviorWeights.cohesion / this.pos.distanceToSq(flockMass));
            this.acceleration = this.acceleration.add(flockAvoid.normalize().multiply(this.world.behaviorWeights.separation));
            this.acceleration = this.acceleration.add(flockHeading.normalize().multiply(this.world.behaviorWeights.alignment));
            this.acceleration = this.acceleration.add(collideAvoid.normalize().multiply(this.world.behaviorWeights.collide));
        }
        
        // bounds of the world (sphere)
        if (this.pos.magnitude() > this.world.radius) {
            this.acceleration = this.acceleration.add(this.pos.normalize().multiply(-100 * Math.log(this.pos.magnitude() - this.world.radius + 1)));
        }
    
        // euler approx motion TODO: RK4?
        this.velocity = this.velocity.add(this.acceleration.multiply(dt)).clamp(200, 200, 200);
        this.pos = this.pos.add(this.velocity.multiply(dt));
    }
}

// FIXME: this class is acting more of an identifier now and isnt very useful
class Collidable extends Entity {
    constructor(world, radius) {
        super(world);
        this.radius = radius;
    }
}

// TODO: behavior objects, componentize or mutate onto each boid
class World { 
    constructor(behaviorWeights = undefined) {
        this.entities = [];
        this.radius = 2500;

        this.octree = new Octree(this.radius*2);
        
        // defining the default argument here for neatness' sake
        this.behaviorWeights = behaviorWeights || {
            vision: 200,
            cohesion: 20,
            separation: 20,
            alignment: 20,
            collide: 20

        }
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

        // step size
        // lower = more accurate but lower performance
        // higher = less accurate by higher performance
        // 0.01 works for ~200 boids, 0.05 works for ~500
        this.dt = 0.05;
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

// global THREE from three.min.js
class ThreeJSRenderer {
    constructor(world, width=window.innerWidth, height=window.innerHeight) {
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize( width, height );

        this.scene = new THREE.Scene();

        this.camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 15000 );
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

        // render the octree quads (for debugging)
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

        // render each entity
        for (var i=0; i < this.world.entities.length; ++i) {
            this.drawEntity(this.world.entities[i]);
        }
    }

    drawEntity(e) {
    }
}

class ThreeJSBoidsRenderer extends ThreeJSRenderer {
    constructor(world, width=window.innerWidth, height=window.innerHeight) {
        super(world, width, height)

        this.camera.position.z = this.world.radius * 2;

        this.boidGeometry = new THREE.CylinderGeometry(0.1, 15, 20, 4);
        this.boidMaterial = new THREE.MeshBasicMaterial( { color: 0x00ff00, wireframe: true } );
        this.collidableGeometry = new THREE.MeshBasicMaterial( { color: 0x0000cc, wireframe: false } );

        var l = new THREE.DirectionalLight( 0xffffff, 0.5 );
        l.position.set(0, 1, 0);
        this.scene.add(l);

        // draws a world boundary sphere
        this.worldSphere = new THREE.Mesh(
            new THREE.SphereGeometry(1),
            new THREE.MeshBasicMaterial( { color: 0x555555, wireframe: true } )
        );
        this.scene.add(this.worldSphere);

        /* experiment of a different bounds curve
        var boundscurve = new THREE.EllipseCurve(0, 0, this.world.radius, this.world.radius, 0, 2*Math.PI, false, 0);
        var boundspath = new THREE.Path( boundscurve.getPoints(25) );
        var boundsgeo = boundspath.createPointsGeometry( 25 );
        this.bounds1 = new THREE.Line(
            boundsgeo,
            new THREE.LineBasicMaterial( { color: 0xffffff } )
        );
        this.bounds2 = new THREE.Line(
            boundsgeo,
            new THREE.LineBasicMaterial( { color: 0xffffff } )
        );
        this.bounds2.quaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.PI / 2
        );
        this.scene.add(this.bounds1);
        this.scene.add(this.bounds2);
        */
    }

    drawWorld() {
        super.drawWorld()
        this.worldSphere.scale.x = this.world.radius;
        this.worldSphere.scale.y = this.world.radius;
        this.worldSphere.scale.z = this.world.radius;
    }

    drawEntity(e) {
        if (e.mesh == undefined) {
            if (e instanceof Boid) {
                e.mesh = new THREE.Mesh(this.boidGeometry, this.boidMaterial);
            } else if (e instanceof Collidable) {
                e.mesh = new THREE.Mesh(new THREE.SphereGeometry(e.radius), this.collidableGeometry);
            }

            this.scene.add(e.mesh);
        }
        
        e.mesh.position.x = e.pos.x;
        e.mesh.position.y = e.pos.y;
        e.mesh.position.z = e.pos.z;

        // magic to point boids in toward heading
        var v = e.velocity.normalize();
        e.mesh.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 1, 0),
            new THREE.Vector3(v.x, v.y, v.z)
        );
    }
}
    


function runBoids () {
    var sim = new Simulator();
    var world = new World({
        vision: 200,
        cohesion: 70,
        separation: 20,
        alignment: 50,
        collide: 85
    });

    // make random boids, then send them in random headings
    for (var i=0; i < 500; ++i) {
        var b = new Boid(world);
        b.pos = new Vector3(
            Math.random() * 3000 - 1500,
            Math.random() * 3000 - 1500,
            Math.random() * 3000 - 1500
        );
        b.velocity = new Vector3(
            Math.random() * 20 - 10,
            Math.random() * 20 - 10,
            Math.random() * 20 - 10
        );
        world.entities.push(b);
    }

    // make random obstacle spheres
    for (var i=0; i < 25; ++i) {
        var b = new Collidable(world, Math.random() * 250 + 100);
        b.pos = new Vector3(
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000,
            Math.random() * 4000 - 2000
        );
        world.entities.push(b);
    }

    sim.world = world;
    sim.step();

    var rend = new ThreeJSBoidsRenderer(world, 960, 720);
    document.getElementById("content").appendChild(rend.renderer.domElement);

    rend.draw();

    var controls = new THREE.OrbitControls(rend.camera, rend.renderer.domElement, rend.renderer.domElement);
    
    window.rend = rend;

    return sim;
}

window.onload = function() {
    var sim = runBoids();
    // expose the simulator for debugging
    window.sim = sim;

    var gui = new dat.GUI({ autoPlace: false });
    var guiWorld = gui.addFolder("World");
    guiWorld.add(sim.world, "radius", 100, 10000);

    var guiBehavior = gui.addFolder("Behavior");
    guiBehavior.add(sim.world.behaviorWeights, "vision", 0, 400);
    guiBehavior.add(sim.world.behaviorWeights, "cohesion", 0, 1000);
    guiBehavior.add(sim.world.behaviorWeights, "separation", 0, 1000);
    guiBehavior.add(sim.world.behaviorWeights, "alignment", 0, 1000);
    guiBehavior.add(sim.world.behaviorWeights, "collide", 0, 1000);

    document.getElementById("content-controls").appendChild(gui.domElement);
    guiWorld.open();
    guiBehavior.open();
};
