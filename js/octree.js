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
        return this.add(other.multiply(-1));
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

class Node {
    constructor(parentNode, centerx, centery, centerz, size, depth) {
        this.MAX_DEPTH = 3;

        this.children = []
        this.childNodes = []
        this.parentNode = parentNode;
        this.depth = depth;

        this.center = new Vector3(centerx, centery, centerz);

        this.size = size;
    }

    // Divide this node into its 8 subnodes
    subdivide() {
        var newpos = this.size/4

        // make a child node for all (8) variants of +/- x/y/z
        for (let iz = 1; iz > -2; iz -= 2) {
            for (let iy = 1; iy > -2; iy -= 2) {
                for (let ix = 1; ix > -2; ix -= 2) {
                    this.childNodes.push(
                        new Node(
                            this,
                            this.center.x + ix*newpos,
                            this.center.y + iy*newpos,
                            this.center.z + iz*newpos,
                            this.size/2,
                            this.depth + 1
                        )
                    );
                }
            }
        }
    }

    // Insert object at a given point
    insert(obj) {
        if (this.childNodes.length < 1 && this.depth < this.MAX_DEPTH) {
            this.subdivide();
        }
        
        if (this.childNodes.length > 0) { 
            // use center of subdivision as std position for object pos
            var fromCenter = obj.pos.subtract(this.center);

            // resolve which octant it belongs in
            if (fromCenter.x > 0 && fromCenter.y > 0 && fromCenter.z > 0)
                this.childNodes[0].insert(obj)
            else if (fromCenter.x < 0 && fromCenter.y > 0 && fromCenter.z > 0)
                this.childNodes[1].insert(obj)
            else if (fromCenter.x > 0 && fromCenter.y < 0 && fromCenter.z > 0)
                this.childNodes[2].insert(obj)
            else if (fromCenter.x < 0 && fromCenter.y < 0 && fromCenter.z > 0)
                this.childNodes[3].insert(obj)
            else if (fromCenter.x > 0 && fromCenter.y > 0 && fromCenter.z < 0)
                this.childNodes[4].insert(obj)
            else if (fromCenter.x < 0 && fromCenter.y > 0 && fromCenter.z < 0)
                this.childNodes[5].insert(obj)
            else if (fromCenter.x > 0 && fromCenter.y < 0 && fromCenter.z < 0)
                this.childNodes[6].insert(obj)
            else if (fromCenter.x < 0 && fromCenter.y < 0 && fromCenter.z < 0)
                this.childNodes[7].insert(obj)
        } else {
            this.children.push(obj);
        }
    }

    // Find objects in a given radius around a point
    search(point, radius) {
        var found = [];

        if (this.childNodes.length > 0) {
            if (point.subtract(this.center).magnitude < radius) {
                for (let quad of this.childNodes) {
                    found = found.concat(search(point, radius));
                }
            }
        }

        return found.concat(this.children);
    }

    // returns a list of all nodes in all children
    getNodes() {
        var found = [];

        if (this.childNodes.length > 0) {
            for (let node of this.childNodes) {
                found = found.concat(node.getNodes());
            }
        }

        return found.concat(this.childNodes)
    }
}

class Octree {
    constructor(size) {
        this.root = new Node(null, 0, 0, 0, size, 0);
    }
    
    insert(obj) {
        this.root.insert(obj);
    }

    search(point, radius) {
        return this.root.search(point, radius);
    }

    getNodes() {
        return this.root.getNodes().concat(this.root);
    }
}
