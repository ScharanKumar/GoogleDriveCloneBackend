const express = require("express");
const path = require("path");
const multer = require('multer');
const fs = require('fs');
const cors = require("cors")
const bcrypt = require("bcrypt")
const jwt = require("jsonwebtoken")



const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json())
app.use(cors())
app.use('/uploads', express.static('uploads'));

const dbPath = path.join(__dirname, "database.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database
    });
    app.listen(3030, () => {
      console.log(`Server Running at http://localhost:3030`);
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

// Set up multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = 'uploads/';
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath);
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        cb(null,(file.originalname)); // Append the file's extension
    }
});

const upload = multer({ storage });

// const authenticateToken = (request, response, next) => {
//     let jwtToken;
//     const authHeader = request.headers["authorization"];
//     if (authHeader !== undefined) {
//       jwtToken = authHeader.split(" ")[1];
//     }
//     if (jwtToken === undefined) {
//       response.status(401);
//       response.send("Invalid JWT Token");
//     } else {
//       jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
//         if (error) {
//           response.status(401);
//           response.send("Invalid JWT Token");
//         } else {
//           next();
//         }
//       });
//     }
//   };

app.post("/register/", async (request, response) => {
    const { username, password } = request.body;
    const hashedPassword = await bcrypt.hash(request.body.password, 10);
    const selectUserQuery = `SELECT * FROM register WHERE username like '${username}'`;
    const dbUser = await db.get(selectUserQuery);
    if (dbUser === undefined) {
      const createUserQuery = `
          INSERT INTO 
            register (username,password) 
          VALUES 
            (
              '${username}', 
              '${hashedPassword}'
            )`;
      const dbResponse = await db.run(createUserQuery);
      const newUserId = dbResponse.lastID;
      response.send(`Created new user with ${newUserId}`);
    } else {
      response.status = 400;
      response.ok = false;
      response.send("Username already exists");
    }
  })

  app.post("/login/", async (request, response) => {
    const { username, password } = request.body;
    const selectUserQuery = `SELECT * FROM register WHERE username = '${username}'`;
    const dbUser1 = await db.get(selectUserQuery);
    if (dbUser1 === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser1.password);
      if (isPasswordMatched === true) {
        const payload = {
          username: username,
        };
        const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  });


  // Create a folder
app.post('/folders', async(req, res) => {
    const { username, name, parent_id, color, created_at } = req.body;

    const query = `INSERT INTO folders (username, name, parent_id, color, created_at) VALUES ('${username}' ,'${name}', '${parent_id}', '${color}', '${created_at}');`
  const res4 = await db.run(query)
  res.json({ id: this.lastID, name, parent_id });

    // db.run(`INSERT INTO folders (name, parent_id) VALUES (?, ?)`, [name, parent_id || null], function(err) {
    //     if (err) {
    //         return res.status(500).json({ error: err.message });
    //     }
    //     res.json({ id: this.lastID, name, parent_id });
    // });
});

app.put("/update/folder",async(req,res)=>{
    const {username,name,id}=req.body
    console.log(name)
    console.log(id)
    const query = `update folders set name= '${name}' where id like ${id} and username like '${username}';`
  const res4 = await db.run(query)
  res.json("successfully updated")
})

app.put("/update/folder/color",async(req,res)=>{
    const {username,color,id}=req.body
    console.log(color)
    console.log(id)
    const query = `update folders set color= '${color}' where id like ${id} and username like '${username}';`
  const res4 = await db.run(query)
  res.json("successfully updated")
})

app.put("/update/files",async(req,res)=>{
    const {username, name,id}=req.body
    console.log(name)
    console.log(id)
    const query = `update files set name= '${name}' where id like ${id} and username like '${username}';`
  const res4 = await db.run(query)
  res.json("successfully updated")
})

// Route to upload a file
app.post('/upload/:folder_id/:date/:username', upload.single('file'), async(req, res) => {

    
    const { username,folder_id,date } = req.params;
    const { filename } = req.file;
    
    
    
    const filepath = req.file.path;
    console.log(filename)
    console.log(filepath)

    const query = `INSERT INTO files (username, name, path,folder_id,created_at) VALUES ('${username}' ,'${filename}', '${filepath}', '${folder_id}', '${date}');`
  const res4 = await db.run(query)
  res.json({ id: this.lastID, filename, filepath });

    
});

// Get folder contents (files and subfolders)
app.get('/folders/:id/:username/contents', async(req, res) => {
    const { id, username } = req.params;
    console.log(id)
    console.log(typeof(id))
    console.log(username)
    console.log(typeof(username))
    

    if ((id) ==='null' || id === "undefined"){
        const query = `SELECT * FROM files where typeof(folder_id) <> 'integer' and username like '${username}';`
        const res4 = await db.all(query)
        console.log(res4)
        const query1 = `SELECT * FROM folders where typeof(parent_id) <> 'integer' and username like '${username}';`
        const res5 = await db.all(query1)
        console.log(res5)
        res.json({ res4, res5 });
    }
    else{
        const query = `SELECT * FROM files where folder_id like ${id} and username like '${username}';`
  const res4 = await db.all(query)
//   console.log(res4)
  
  const query1 = `SELECT * FROM folders where parent_id like ${id} and username like '${username}';`
  const res5 = await db.all(query1)
//   console.log(res5)
  
  res.json({ res4, res5 });
    }
  
});

app.get('/all/files/:username', async(req, res) => {
    const {  username } = req.params;
    console.log(username)
    
    const query = `SELECT * FROM files where username like '${username}';`
        const res4 = await db.all(query)
        res.json({ res4 });
  
});