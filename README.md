#BoxspringJS Demo

A web application developed to show the power of [BoxspringJS](https://github.com/rranauro/boxspringjs).

##Dependencies

In order to run this application, you have to include the following JS libraries:

* JQuery 
* JQueryui
* underscore
* backbone
* bootstrap
* boxspring

##Structure

The whole application consists of 4 pages:

* Welcome page
* Select columns page
* Set page size and cache size page
* Table page

##Install

* 1. Download the zip file [here](http://michael0401.cloudant.com/bxdemo/_design/bxdemo/bxdemo.zip).
* 2. You need to replicate the bxdemo database (https://bxdemo:bxdemo@bxdemo.cloudant.com/bxdemo)from cloudant to your local/cloudant database.
* 3. Open get-data.js file in any text editor tool and change with your couchdb database, username and password: 

	var auth = { name: "yourusername", password: "yourpassword" } 
	Maker = Boxspring().set({'db_name': 'yourdatabase', '_design': 'my-design', '_view': 'my-view', 'auth': auth });  //initialize boxspringJS

* 4. Upload the bxdemo folder to your couchdb database and open the url in the browser. If it is local, try http://127.0.0.1:5984/yourdatabase/_design/bxdemo/index.html. If it is on cloudant, try http://yourusername.cloudant.com/yourdatabase/_design/bxdemo/index.html.	

##Acknowledgements

##License


        
     


    
