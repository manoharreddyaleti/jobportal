var express = require('express');
var app = express();
var path = require('path');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/dist/employer')));
var Sync = require('sync');

//nodemailer
var nodemailer = require('nodemailer');
var smtpTransport = require('nodemailer-smtp-transport');

//password encrypt module
const Cryptr = require('cryptr');
const cryptr = new Cryptr('myTotalySecretKey');

//jwt
var jwt = require('jsonwebtoken');


//filestorage module
const multer = require('multer');
//for file storage
var file_location;
const DIR = './uploads';
let storage = multer.diskStorage({
    destination: (req, file, cb) => {

        cb(null, DIR);
    },
    filename: (req, file, cb) => {
        cb(null, file.fieldname + '-' + Date.now() + '.' + path.extname(file.originalname));

    }

});
let upload = multer({ storage: storage });

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));




var config = require('./config');
//mysql connection
var mysql = require('mysql');
var con = mysql.createConnection({
    host: "humint.cjbav8vvh0dt.us-east-1.rds.amazonaws.com",
    user: "manohar",
    password: "manohar219",
    port: "3306",
    database: "humint"
});

con.connect(function (err) {
    if (err) throw err;
    console.log("Connected!");
});

app.post('/api/upload', upload.single('photo'), function (req, res) {
    console.log(req);
    console.log(req.file.path);
    if (!req.file) {
        console.log("No file received");
        return res.send({
            success: false
        });

    } else {
        file_location = req.file.path;
        console.log('file received');
        return res.send(req.file.path);
    }
});



app.post('/postJobPost', (req, res) => {

    var Location = "";
    for (let i = 0; i < req.body.Location.length; i++) {

        if (i == 0) {
            Location = req.body.Location[i];
        }
        if (i > 0) {
            Location = Location + "," + req.body.Location[i];

        }
    }
    console.log(Location);
    req.body.Location = Location;
    console.log(req.body);
    con.query("insert into alljobs set ?", req.body, (err, result) => {
        if (err) throw err;
        res.send(JSON.stringify("Your Job Posted Successfully"));
    })
});

app.get('/allJobSeekerDetails', (req, res) => {
    con.query("select * from job_seeker_register left join jobSeekerEducation on job_seeker_register.id=jobSeekerEducation.job_seeker_id left join jobseekerdetails on job_seeker_register.id=jobseekerdetails.job_seeker_id GROUP BY id", (err, result) => {
        if (err) throw err;
        console.log(result);
        res.send(result);
    })
});

app.post('/checkRecruiterLoginData', (req, res) => {
    console.log(req.body);
    con.query("select * from employer_register where Employer_Email=?", [req.body.email], (err, employer_data) => {
        if (err) throw err;
        console.log(employer_data);
        if (employer_data.length == 1) {
            for (employee of employer_data) {
                console.log(employee);
                let decryptPassword = cryptr.decrypt(employee.password);
                if (decryptPassword == req.body.password) {
                    console.log("user exist and password match");
                    // res.send(employee);
                    var token = jwt.sign({ email: req.body.email }, config.secret, {
                        expiresIn: 86400 // expires in 24 hours
                    });
                    console.log(token);
                    res.status(200).send({ auth: true, token: token });

                }
                else {
                    console.log("user exist and password not match...!");
                    res.send(false);
                }
            }
        }
        else if (employer_data.length == 0) {
            console.log("user doesn't exist");
            res.send(JSON.stringify("user doesn't exist"));

        }

    })

});


app.get('/username', verifyToken, (req, res) => {
    console.log(decodedToken.email);
    //  res.send(decodedToken.email);
    var query = "select * from employer_register where Employer_Email='" + decodedToken.email + "'";
    console.log(query);
    con.query(query, (err, result) => {
        if (err) throw err;
        console.log(result);
        return res.status(200).json(result[0]);
    })

});
var decodedToken = '';
function verifyToken(req, res, next) {
    let token = req.query.token;

    jwt.verify(token, config.secret, function (err, tokendata) {
        if (err) {
            return res.status(400).json({ message: 'Unauthorized request' });
        }
        console.log(tokendata);
        console.log(tokendata.email);
        if (tokendata) {
            decodedToken = tokendata;

            next();
        }
    })

};


app.post('/getPostedJobs', (req, res) => {
    console.log(req.body);
    con.query("select * from alljobs where employerId=?", [req.body.employerId], (err, result) => {
        if (err) throw err;
        res.send(result);
    })
});

app.post('/sendEmail', (req, res) => {
    console.log(req.body);


    for (let i = 0; i < req.body.emails.length; i++) {
      
        var transporter = nodemailer.createTransport(smtpTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            auth: {
                user: 'manoharreddyaleti123@gmail.com',
                pass: 'manohar219'
            }
        }));

        var mailOptions = {
            from: 'manoharreddyaleti123@gmail.com',
            to: req.body.emails[i],
            subject: 'Job openings',
            text: "Job recommendations based on your humint profile",
            html: "<h1>"+req.body.jobDetails.Designation+"</h1><br><b>"+req.body.jobDetails.CompanyName+"</b><br>Experience :"+
            req.body.jobDetails.MinExperience+" to "+req.body.jobDetails.MaxExperience+" yrs<br>Skills :"+req.body.jobDetails.Keywords+"<br> <h2>Apply using this link<h2> <a href=https://humintglobal.com>Apply now</a>"
        };

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log('Email sent: ' + info.response);
                res.send(JSON.stringify("Email sent to selected canditates"));
            }
        });
    }

});
app.post('/getApplications',(req,res)=>{
    console.log(req.body);
    var query="select * from jobapplications where jobId="+req.body.job_id
    con.query(query,(err,result)=>{
        if(err) throw err;
        res.send(result);
    })
});

app.post('/postEmployerRegisterData',(req,res)=>{
    var encryptPassword;
    console.log(req.body);
    encryptPassword = cryptr.encrypt(req.body.password);
    req.body.password = encryptPassword;
    con.query("insert into employer_register set ?",req.body,(err,result)=>{
        if(err) throw err;
        res.send(JSON.stringify("You registed successfuly"));
        
    })
});


var encryptPassword;
app.post('/postUserRegisterData', (req, res) => {
    console.log(req.body);


    con.query("select * from job_seeker_register where email=?", [req.body.email], (err, userData) => {
        if (err) throw err;
        console.log(userData.length);
        if (userData.length == 1) {
            res.send({ status: false, data: "user already exist with this mail" });
        }
        else if (userData.length == 0) {

            encryptPassword = cryptr.encrypt(req.body.password);
            console.log(encryptPassword);
            req.body.password = encryptPassword;
            var skills='';
             
    for(let i=0;i<req.body.skills.length;i++){
      
        if(i==0){
            skills=req.body.skills[i];
        }
        if(i>0){
            skills=skills+","+req.body.skills[i];

        }
            }
req.body.skills=skills;
            console.log(req.body);

            con.query("insert into job_seeker_register set ?", req.body, (err, data) => {
                if (err) throw err;
                console.log(data.insertId);
                res.send({ status: true, data: data.insertId });
            })
        }
    })



});




app.post('/postJobSeekerDetails', (req, res) => {
    console.log(req.body);
    con.query("insert into jobseekerdetails set ?", req.body, (err, data) => {
        if (err) throw err;
        console.log(data);
        res.send(JSON.stringify("uploaded successfully"));
    })
});
app.post('/postEmploymentData', (req, res) => {
    var employment=req.body.employment;
   
    delete req.body.employment;
       console.log(req.body);
     
      
   console.log(req.body);
       con.query("insert into jobseekerdetails set ?",req.body, (err, data) => {
           if (err) throw err;
   for(let i=0;i<employment.length;i++){
   
       con.query("insert into experiencedCandidateDetails set ?",employment[i],(err,result)=>{
           if(err) throw err;
        
       })
   }
   
       })
   });
   app.post('/postEducationDetails',(req,res)=>{
    console.log(req.body);
    con.query("insert into jobSeekerEducation set ?", req.body, (err,employer) => {
        if(err) throw err;
        
        res.send(JSON.stringify("All your details posted successfully...."));
    })
});
   


// app.post('/searchForJobseeker', (req, res) => {


//     var  skillSearchQuery=" ";
//     var matchedJobSeekers = [];
//     var skillid = 0;
//     console.log(req.body);


//     if (req.body.Skills != null || " ") {
//         console.log("skills are not null");

//         var skills = req.body.Skills.split(",");
//         console.log(skills);
//         skillSearchQuery = "SELECT * FROM job_seeker_register";



//         console.log(skillSearchQuery);
//         con.query(skillSearchQuery, (err, result)=> {

//             if (err) throw err;
//             console.log(result); 


//             for (skill of skills) {
//                 console.log(skill);


//             }



//         })
//         for (skill of skills) {
//             if (skillid == 0) {
//                 // console.log("length"+skillid.length);





//             }

//             else {
//                 for (let i = 0; i < skillid; i++) {
//                     console.log("length not 0")
//                      skillSearchQuery = 'SELECT id FROM job_seeker_register where id=' + skillid[i] + 'lower(skills) LIKE %' + skill + '%';
//                     con.query(skillSearchQuery, (err, result) => {
//                         if (err) throw err;
//                         console.log(result);
//                         for (id of result) {
//                             skillid.push(id.id);
//                         }
//                     })
//                 }



//             }

//         }


//     }

//     // if (req.body.Designation != null && ' ') {
//     //     console.log("designation not null");
//     //     var designationSearchQuery = "SELECT job_seeker_id FROM jobseekerdetails where lower(currentdesignation) LIKE '%" + req.body.Designation + "%'";

//     //     con.query(designationSearchQuery, (err, result) => {
//     //         if (err) throw err;
//     //         //   console.log(result);
//     //         for (jobSeeker of result) {
//     //             matchedJobSeekers.push(jobSeeker);
//     //             console.log(jobSeeker);
//     //         }
//     //     })

//     // }

// })

app.listen('6000');