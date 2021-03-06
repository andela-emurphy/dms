import chaiHttp from 'chai-http';
import chai from 'chai';

import { userData } from '../TestData';
import app from '../../../server/server';
import db from '../../../server/app/db/models';

chai.use(chaiHttp);
chai.should();

let token = null;
let adminToken = null;
describe('User controller', () => {
  before((done) => {
    db.Role.bulkCreate([
      { title: 'regular' },
      { title: 'admin' }
    ], { validate: true }).then(() => {
      db.User.bulkCreate(userData, { validate: true })
      .then(() => {
        chai.request(app)
          .post('/users/login')
          .send({
            username: 'mimi',
            password: '12345678'
          })
          .then((res) => {
            token = res.body.token;
            chai.request(app)
              .post('/users/login')
              .send({
                username: 'dadmin',
                password: '12345678'
              }).then((res) => {
                adminToken = res.body.token;
                done();
              });
          });
      });
    }).catch((err) => { throw err; });
  });

  after((done) => {
    db.sequelize.sync({ force: true }).then(() => done());
  });
  describe('Create user', () => {
    it('should create 201 user created', (done) => {
      chai.request(app)
        .post('/users')
        .send({
          id: 55,
          firstname: 'enaho',
          lastname: 'murphy',
          username: 'enahomurphy',
          email: 'test@test.com',
          password: '12345678',
        })
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.be.a('object');
          res.body.should.have.property('username').eql('enahomurphy');
          res.body.should.have.property('firstname').eql('enaho');
          res.body.should.have.property('lastname').eql('murphy');
          res.body.should.have.property('email').eql('test@test.com');
          done();
        });
    });

    it('should not create a user without required fields', (done) => {
      chai.request(app)
        .post('/users')
        .send({
          firstname: 'enaho',
          lastname: 'murphy',
          email: 'test@test.com',
        })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.have.property('message');
          res.body.message.should.be.a('array');
          res.body.message.should.have.lengthOf(2);
          res.body.message[0].should.eql('username cannot be null');
          res.body.message[1].should.eql('password cannot be null');
          done();
        });
    });
  });

  describe('Get User', () => {
    it('should return a user', (done) => {
      chai.request(app)
      .get('/users/400')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        res.body.should.be.a('object');
        res.body.should.have.property('id').eql(400);
        res.body.should.have.property('username').eql('mimi');
        res.body.should.have.property('firstname').eql('enaho');
        res.body.should.have.property('lastname').eql('murphy');
        res.body.should.have.property('role').eql('regular');
        done();
      });
    });

    it('should return user if admin makes the request', (done) => {
      chai.request(app)
        .get('/users/55')
        .set('Authorization', `Bearer ${adminToken}`)
        .end((err, res) => {
          res.body.should.be.a('object');
          res.body.should.have.property('id').eql(55);
          res.body.should.have.property('username').eql('enahomurphy');
          res.body.should.have.property('firstname').eql('enaho');
          res.body.should.have.property('lastname').eql('murphy');
          res.body.should.have.property('email').eql('test@test.com');
          done();
        });
    });

    it('should return 403 if details does not belong to user', (done) => {
      chai.request(app)
      .get('/users/55')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        res.should.have.status(403);
        res.body.should.have.property('message')
          .eql('Forbidden! you cannot access this route');
        done();
      });
    });

    it('should return 404 if user does not exit', (done) => {
      chai.request(app)
      .get('/users/55555')
      .set('Authorization', `Bearer ${adminToken}`)
      .end((err, res) => {
        res.should.have.status(404);
        res.body.should.have.property('message')
          .eql('user with id 55555 not found');
        done();
      });
    });
  });

  describe('Get all Users', () => {
    it('should return a 403 for none admin user', (done) => {
      chai.request(app)
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .end((err, res) => {
        res.should.have.status(403);
        res.body.should.be.a('object');
        res.body.should.have.property('message')
          .eql('Forbidden! you cannot access this route');
        done();
      });
    });

    it('should return all users for admin', (done) => {
      chai.request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('pagination');
        res.body.rows.should.be.a('array');
        res.body.rows.should.have.lengthOf(4);
        done();
      });
    });

    it('should return two users for query limit 2', (done) => {
      chai.request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 2 })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('pagination');
        res.body.rows.should.be.a('array');
        res.body.rows.should.have.lengthOf(2);
        done();
      });
    });

    it('should return one user for limit 3 offset 3', (done) => {
      chai.request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ limit: 3, offset: 3 })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('pagination');
        res.body.rows.should.be.a('array');
        res.body.rows.should.have.lengthOf(1);
        done();
      });
    });

    it('should return three users for user query murphy', (done) => {
      chai.request(app)
      .get('/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ search: 'murphy' })
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.be.a('object');
        res.body.should.have.property('pagination');
        res.body.rows.should.be.a('array');
        res.body.rows.should.have.lengthOf(3);
        done();
      });
    });
  });

  describe('Update User', () => {
    it('should return a 401 for none Authenticated users', (done) => {
      const fakeToken = 'this.is.a.fake.token';
      chai.request(app)
      .put('/users/400')
      .set('Authorization', `Bearer ${fakeToken}`)
      .end((err, res) => {
        res.should.have.status(401);
        res.body.should.be.a('object');
        res.body.should.have.property('message')
          .eql('Authorization denied! Invalid token');
        done();
      });
    });

    it('should update the user details', (done) => {
      chai.request(app)
      .put('/users/1')
      .send({
        firstname: 'joel',
        lastname: 'micheal'
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('message').eql('User updated');
        done();
      });
    });

    it('should return 200 if admin tries to update any account', (done) => {
      chai.request(app)
      .put('/users/401')
      .send({
        username: 'jabless',
        lastname: 'micheal'
      })
      .set('Authorization', `Bearer ${adminToken}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('message').eql('User updated');
        done();
      });
    });

    it(`should return 403 if a regular user tries 
      to update another user account`, (done) => {
      chai.request(app)
        .put('/users/401')
        .send({
          firstname: 'joel',
          lastname: 'micheal'
        })
        .set('Authorization', `Bearer ${token}`)
        .end((err, res) => {
          res.should.have.status(403);
          res.body.should.have.property('message')
            .eql('Forbidden! you cannot access this route');
          done();
        });
    });
  });

  describe('Delete User', () => {
    let deleteToken = null;
    beforeEach((done) => {
      db.User.create({
        id: '780',
        firstname: 'naruto',
        lastname: 'uzumaki',
        email: 'the@the.com',
        password: 'goldetulip',
        username: 'orochimaru',
      })
      .then(() => {
        chai.request(app)
          .post('/users/login')
          .send({
            username: 'orochimaru',
            password: 'goldetulip'
          })
          .then((res) => {
            deleteToken = res.body.token;
            done();
          })
        .catch((err) => { throw err; });
      });
    });

    afterEach((done) => {
      db.User.findById(780)
        .then((user) => {
          if (user) {
            user.destroy()
              .then(() => done());
          } else done();
        });
    });

    it('should delete a user if the request is from admin', (done) => {
      chai.request(app)
      .delete('/users/780')
      .set('Authorization', `Bearer ${adminToken}`)
      .end((err, res) => {
        res.should.have.status(200);
        res.body.should.have.property('message').eql('User deleted');
        done();
      });
    });

    it(`should return 403 if a regular user tries 
        to delete another user account`, (done) => {
      chai.request(app)
          .delete('/users/780')
          .set('Authorization', `Bearer ${token}`)
          .end((err, res) => {
            res.should.have.status(403);
            res.body.should.have.property('message')
              .eql('Forbidden! you cannot access this route');
            done();
          });
    });

    it('should return 403 if an admin tries to delete his account', (done) => {
      chai.request(app)
          .delete('/users/1')
          .set('Authorization', `Bearer ${adminToken}`)
          .end((err, res) => {
            res.should.have.status(403);
            res.body.should.have.property('message')
              .eql('Forbidden! super admin cannot be deleted');
            done();
          });
    });

    it('should return a 403 if user tries to delete his/her account',
      (done) => {
        chai.request(app)
          .delete('/users/780')
            .set('Authorization', `Bearer ${deleteToken}`)
            .end((err, res) => {
              res.should.have.status(403);
              res.body.should.have.property('message')
                .eql('Forbidden! you cannot access this route');
              done();
            });
      });

    it('should return a 401 for none Authenticated users', (done) => {
      const fakeToken = 'this.is.a.fake.token';
      chai.request(app)
      .delete('/users/780')
      .set('Authorization', `Bearer ${fakeToken}`)
      .end((err, res) => {
        res.should.have.status(401);
        res.body.should.be.a('object');
        res.body.should.have.property('message')
          .eql('Authorization denied! Invalid token');
        done();
      });
    });
  });
});

