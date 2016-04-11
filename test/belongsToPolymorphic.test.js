var request = require('supertest');
var loopback = require('loopback');
var expect = require('chai').expect;
var JSONAPIComponent = require('../');
var app;
var ds;
var Post;
var File;

describe('loopback json api belongsTo polymorphic relationships', function () {
  beforeEach(function () {
    app = loopback();
    app.set('legacyExplorer', false);
    ds = loopback.createDataSource('memory');
    Post = ds.createModel('post', {
      id: {type: Number, id: true},
      title: String,
      content: String
    });
    Post.settings.plural = 'posts';
    app.model(Post);

    File = ds.createModel('file', {
      id: {type: Number, id: true},
      fileName: String,
      parentId: Number,
      parentType: String
    });
    File.settings.plural = 'files';
    File.belongsTo('parent', {
      polymorphic: {
        foreignKey: 'parentId',
        discriminator: 'parentType'
      }
    });
    app.model(File);

    app.use(loopback.rest());
    JSONAPIComponent(app);
  });

  describe.only('File belonging to a Post', function () {
    beforeEach(function (done) {
      Post.create({
        title: 'Post One',
        content: 'Content'
      }, function (err, post) {
        expect(err).to.equal(null);
        File.create({
          fileName: 'blah.jpg',
          parentId: post.id,
          parentType: 'post'
        }, done);
      });
    });

    it('should have a relationship to Post', function (done) {
      request(app).get('/files/1')
        .end(function (err, res) {
          expect(err).to.equal(null);
          console.log(res.body);
          expect(res.body).to.not.have.key('errors');
          expect(res.body.data.relationships.parent).to.be.an('object');
          done();
        });
    });

    it('should return the Post that this file belongs to when included flag is present', function (done) {
      request(app).get('/files/1?include=parent')
        .end(function (err, res) {
          expect(err).to.equal(null);
          console.log(res.body);
          expect(res.body).to.not.have.key('errors');
          expect(res.body.included).to.be.an('array');
          expect(res.body.included[0].type).to.equal('posts');
          expect(res.body.included[0].id).to.equal('1');
          done();
        });
    });

    it('should return the Post that this file belongs to when following the relationship link', function (done) {
      request(app).get('/files/1')
        .end(function (err, res) {
          expect(err).to.equal(null);
          console.log(res.body);
          expect(res.body).to.not.have.key('errors');
          request(app).get(res.body.data.relationships.parent.links.related.split('api')[1])
            .end(function (err, res) {
              expect(err).to.equal(null);
              expect(res.body).to.not.have.key('errors');
              expect(res.body.data.type).to.equal('posts');
              expect(res.body.data.id).to.equal('1');
              done();
            });
        });
    });
  });
});
