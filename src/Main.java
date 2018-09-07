import java.io.File;

public class Main {
  public static void main(String[] args) {
    galeria(3);
  }

  private static void galeria(int i) {
    File dir = new File("G:\\Users\\Bator\\Desktop\\dogoterapia\\images\\galeria\\" + i);
    System.out.println("<div class=\"galleria\">");
    for (File file : dir.listFiles()) {
      System.out.println("<img src=\"images/galeria/" + i + "/" +file.getName()+"\" data-title=\""+file.getName()+"\" data-description=\""+file.getName()+"\">");
    }
    System.out.println("</div>");
  }
}
