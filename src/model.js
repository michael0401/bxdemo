if (typeof BX === 'undefined') {
	var BX = {};
}

(function(global) {

	var MainModel = Backbone.Model.extend({	
		defaults: function() {
	     	 return {
				 'mainWindow':"",  //control the display of the main window  
				 'tableData':"", 
				 'columnData':""    	 	 
	     	 };
	    },
	});
	
	var mainmodel = new MainModel;
		
	mainmodel.on("change:mainWindow", function(){
		if(mainmodel.get('mainWindow')==='page1'){		
			$("#page1").show();
			$("#page2").hide();
			$("#page3").hide();
			$("#page4").hide();
			mainmodel.set('tableData', "");
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