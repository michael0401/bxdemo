if (typeof BX === 'undefined') {
	var BX = {};              //global
}

(function(global) {
	
	/*
	main model 
	*/
	var MainModel = Backbone.Model.extend({	
		defaults: function() {
	     	 return {
				 'mainWindow':"",  //control the display of the main window (page1, page2, page3, page4)
				 'tableData':"",   //save the data got from database
				 'columnData':"" ,  //save the selected columns
				 'pageSize':0,  	//save the selected page size
	     	 };
	    },
	});
	
	var mainmodel = new MainModel;
	
	/*
	change event on mainWindow attribute of mainmodel, which will change the main window view
	*/
	mainmodel.on("change:mainWindow", function(){
		if(mainmodel.get('mainWindow')==='page1'){		
			$("#page1").show();
			$("#page2").hide();
			$("#page3").hide();
			$("#page4").hide();
		}
		else if(mainmodel.get('mainWindow')==='page2'){		
			$("#page2").show();
			$("#page1").hide();
			$("#page3").hide();
			$("#page4").hide();
		}
		else if(mainmodel.get('mainWindow')==='page3'){		
			$("#page3").show();
			$("#page1").hide();
			$("#page2").hide();
			$("#page4").hide();
		}
		else if(mainmodel.get('mainWindow')==='page4'){		
			$("#page3").hide();
			$("#page1").hide();
			$("#page2").hide();
			$("#page4").show();
		}
	});
	
	global.mainmodel = mainmodel;
	
}(BX));