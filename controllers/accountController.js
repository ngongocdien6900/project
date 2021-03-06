const UserModel = require('../model/UserModel');
const bcrypt = require('bcryptjs');
// const salt = bcrypt.genSaltSync(10); nếu có cái này thì nó ra false, nên để trực tiếp vào luôn
// const jwt = require('jsonwebtoken');
// const secret = 'NgocDien';

//upload avatar
const multer = require('multer');
const { response } = require('express');

let storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // đường dẫn nó up lên
        cb(null, 'public/upload')
    },
    filename: function (req, file, cb) {
        // tránh up trùng file
        cb(null, Date.now() + "-" + file.originalname)
    }
});
let upload = multer({
    storage: storage,
    fileFilter: function (req, file, cb) {
        console.log(file);
        //những loại file được phép upload
        if (file.mimetype == "image/bmp" || file.mimetype == "image/png" || file.mimetype == "image/jpg" || file.mimetype == "image/jpeg" || file.mimetype == "image/gif") {
            cb(null, true)
        } else {
            return cb(new Error('Only image are allowed!'))
        }
    }
    //name bên upload
}).single("avatar");

module.exports = {
    getRegister: (req, res) => {
        res.render('account/register')
    },
    postRegister: (req, res) => {
        upload(req, res, err => {
            if (err instanceof multer.MulterError) {
                res.json({
                    error: 0,
                    msg: "A Multer error occurred when uploading"
                })
            } else if (err) {
                res.json({
                    error: 0,
                    msg: "An unknown error occurred when uploading." + err
                })
            } else {
                //tìm username với email trên database
                UserModel.findOne({
                    $or: [
                        { username: req.body.username },
                        { email: req.body.email }
                    ]
                })
                    .then(data => {
                        //nếu tồn tại email
                        if (data) {
                            res.json({
                                error: true,
                                msg: 'Email hoặc username đã có người đăng kí',
                            })
                        }
                        //nếu tồn tại password
                        //không tồn tại
                        else {
                            bcrypt.hash(req.body.password, 10, function (err, hash) {
                                return UserModel.create({
                                    name: req.body.name,
                                    email: req.body.email,
                                    username: req.body.username,
                                    password: hash, // password bây giờ sẽ bằng đoạn mã hóa 
                                    address: req.body.address,
                                    phone: req.body.phone,
                                    image: req.file.filename
                                })
                                    .then(data => {
                                        res.redirect('/account/login')
                                    })
                            })
                        }
                    })
                    .catch(err => {
                        res.json({
                            error: true,
                            msg: 'Tạo tài khoản thất bại' + err
                        })
                    })
            }
        })
    },
    getLogin: (req, res) => {
        res.render('account/login');
    },
    postLogin: (req, res) => {
        //findOne giống như ID , còn find là giống class . class nó trả ra 1 mảng . Thì data[0].password
        UserModel.findOne({
            username: req.body.username
        }, (err, user) => {
            if (!err && user != null) {
                bcrypt.compare(req.body.password, user.password, (err2, result) => {
                    if (result == false) {

                        res.json({
                            error: true,
                            msg: 'Sai password'
                        })
                    } else {

                        req.session.userId = user._id
                        res.redirect('/admin')
                    }
                })
            } else {
                res.json({
                    error: true,
                    msg: 'Sai username'
                })
            }
        })
    },
    getLogout: (req, res) => {
        req.session.destroy(() => {
            res.redirect('/account/login')
        })
    },
    getEditProfile: (req, res) => {
        if (req.session.userId) {
            res.render('account/editProfile')
        }
        //nếu chưa đăng nhập
        res.redirect('/account/login')

    },
    postEditProfile: (req, res) => {
        //req.body || req.file gọi bên trong upload vì dùng multer vì form có ectype
        // xử lí upload file (Check xem khách hàng có chọn file mới hay không ?)
        upload(req, res, err => {
            //1. Không có file mới , update mấy cái kia , k update image
            if (!req.file) {
                // tìm tài khoản trong db 
                UserModel.findOne({
                    username: req.body.username
                }, (err, user) => {
                    if (!err && user != null) {
                        // kiểm tra password cũ nhập đúng hay chưa ?
                        bcrypt.compare(req.body.oldPassword, user.password, (err2, result) => {
                            if (result == false) {
                                // sai
                                res.json({
                                    error: true,
                                    msg: 'Sai password cũ'
                                })
                            } else {
                                if (req.body.newPassword != "" || req.body.newPassword > 6) {
                                    //đúng
                                    bcrypt.hash(req.body.newPassword, 10, function (err, hash) {
                                        UserModel.updateOne({
                                            _id: req.body.idUser
                                        }, {
                                            name: req.body.name,
                                            email: req.body.email,
                                            username: req.body.username,
                                            password: hash,
                                            address: req.body.address,
                                            phone: req.body.phone,
                                        }, err => {
                                            if (err) {
                                                res.json({
                                                    error: 0,
                                                    msg: err
                                                })
                                            } else {
                                                // nếu không có lỗi sẽ chuyển hướng qua trang home (role == 0) / homeAdmin (role == 1)
                                                if (user.role == 1) {
                                                    res.redirect('/admin')
                                                } else {
                                                    res.redirect('/')
                                                }
                                            }
                                        })
                                    })
                                } else {
                                    //đúng
                                    UserModel.updateOne({
                                        _id: req.body.idUser
                                    }, {
                                        name: req.body.name,
                                        email: req.body.email,
                                        username: req.body.username,
                                        address: req.body.address,
                                        phone: req.body.phone,
                                    }, err => {
                                        if (err) {
                                            res.json({
                                                error: 0,
                                                msg: err
                                            })
                                        } else {
                                            // nếu không có lỗi sẽ chuyển hướng qua trang home (role == 0) / homeAdmin (role == 1)
                                            if (user.role == 1) {
                                                res.redirect('/admin')
                                            } else {
                                                res.redirect('/')
                                            }
                                        }
                                    })
                                }
                                // end else if (req.body.newPassword != "" || req.body.newPassword > 6)
                            }
                        })
                    } else {
                        res.json({
                            error: true,
                            msg: 'Sai username'
                        })
                    }
                })
                // end findOne 

                // có update image mới
            } else {
                if (err instanceof multer.MulterError) {
                    res.json({
                        error: 0,
                        msg: "A Multer error occurred when uploading"
                    })
                } else if (err) {
                    res.json({
                        error: 0,
                        msg: "An unknown error occurred when uploading." + err
                    })
                } else {
                    UserModel.findOne({
                        //tìm tài khoản trong db
                        username: req.body.username
                    }, (err, user) => {
                        if (!err && user != null) {
                            // kiểm tra password cũ nhập đúng hay chưa ?
                            bcrypt.compare(req.body.oldPassword, user.password, (err2, result) => {
                                if (result == false) {
                                    // sai
                                    res.json({
                                        error: true,
                                        msg: 'Sai password cũ'
                                    })
                                } else {
                                    if (req.body.newPassword != "" || req.body.newPassword > 6) {
                                        //đúng
                                        bcrypt.hash(req.body.newPassword, 10, function (err, hash) {
                                            UserModel.updateOne({
                                                _id: req.body.idUser
                                            }, {
                                                name: req.body.name,
                                                email: req.body.email,
                                                username: req.body.username,
                                                password: hash,
                                                address: req.body.address,
                                                phone: req.body.phone,
                                                image: req.file.filename
                                            }, err => {
                                                if (err) {
                                                    res.json({
                                                        error: 0,
                                                        msg: err
                                                    })
                                                } else {
                                                    // nếu không có lỗi sẽ chuyển hướng qua trang home (role == 0) / homeAdmin (role == 1)
                                                    if (user.role == 1) {
                                                        res.redirect('/admin')
                                                    } else {
                                                        res.redirect('/')
                                                    }
                                                }
                                            })
                                        })
                                    } else {
                                        //đúng
                                        UserModel.updateOne({
                                            _id: req.body.idUser
                                        }, {
                                            name: req.body.name,
                                            email: req.body.email,
                                            username: req.body.username,
                                            password: hash,
                                            address: req.body.address,
                                            phone: req.body.phone,
                                            image: req.file.filename
                                        }, err => {
                                            if (err) {
                                                res.json({
                                                    error: 0,
                                                    msg: err
                                                })
                                            } else {
                                                // nếu không có lỗi sẽ chuyển hướng qua trang home (role == 0) / homeAdmin (role == 1)
                                                if (user.role == 1) {
                                                    res.redirect('/admin')
                                                } else {
                                                    res.redirect('/')
                                                }
                                            }
                                        })
                                    }
                                    //end if else (req.body.newPassword != "" || req.body.newPassword > 6)
                                }
                            })
                            // end kiểm tra password cũ nhạp đúng k? 
                        } else {
                            res.json({
                                error: true,
                                msg: 'Sai username'
                            })
                        }
                    })
                    // end findOne 
                }
            }
        })
        // end upload 
    }
    // end edit postProfile 
}