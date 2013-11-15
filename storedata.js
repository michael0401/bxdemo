// BoxspringJS dependencies
_ = require('underscore');		
Backbone = require('Backbone');	
fs = require('fs');
Boxspring = require('boxspring');
FileObject = require('js-fileio');
jQuery = require('jquery')

// set the auth and url from the environment
// auth file { "auth": {"name": "some-user", "password": "secret-password"}};	
auth = {'name': 'michael', 'password': 'abc123' };
url = 'http://localhost:5984';
Maker = Boxspring().set({'db_name': 'bxsample', '_design': 'my-design', '_view': 'my-view', 'auth': auth });
var boxspringjs = Maker.use();
var file_array = fs.readdirSync('../HTML/xmls');
var doc_array = [];
var i=0;
var temp_object = {};
//var bulk = boxspring.db.bulk();

var convert = function(i){
	
	if(i<1000){//6970
		
		 FileObject.server('file', {'root': '../HTML/xmls'})
		     .toJson('/'+file_array[i], function (err, response) {
		         if (err) {
		             // handle the error
		         }
				 temp_object = jQuery.parseJSON(response.json);
		         doc_array.push(boxspringjs.doc('doc'+i).set({'content': temp_object}));
				 convert(i+1);
		 });
     }
	 else{ 	
		 boxspringjs.bulk(doc_array).max(100).save(function(err, result){
	         if (err) {
	             console.log(err);
	         }
			 console.log(result.code);
		 });
	 }
}

convert(i);
